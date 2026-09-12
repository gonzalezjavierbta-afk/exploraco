# **Sistema de Auditoría y Control de Consumo de Cuota \- OpenCode (ExploraCO)**

**Fecha de Creación:** 2026-09-11  
**Estado:** Propuesta de Especificación / Documentación Técnica

## **1\. Visión General del Sistema**

El sistema de control de cuotas para OpenCode tiene como objetivo auditar, desglosar y analizar el consumo financiero (costos en USD) y volumétrico (tokens de entrada, salida, razonamiento y caché) generado por las invocaciones a modelos de Inteligencia Artificial dentro del proyecto **ExploraCO**.  
El núcleo del sistema reside en el script ejecutable scripts/informe-cuota.js, el cual realiza consultas de lectura segura sobre la base de datos SQLite interna de OpenCode (opencode.db) y exporta informes estructurados en formato Markdown para su inspección y seguimiento.

## **2\. Principios de Diseño e Infraestructura**

> * **Lectura Segura y Read-Only:** El script abre la base de datos opencode.db utilizando el módulo nativo node:sqlite (DatabaseSync) configurado explícitamente con readOnly: true y el parámetro de URL SQLite mode=ro. Esto evita bloqueos o corrupción en la base durante ejecuciones activas de OpenCode.  
> * **Filtro de Ámbito por Proyecto:** De manera predeterminada, todas las consultas filtran las sesiones por la ruta del directorio (directory LIKE '%exploraco%') para garantizar que los costos pertenezcan únicamente al ecosistema del proyecto.  
> * **Compatibilidad ASCII (ASCII-Safe):** El formato de salida y la lógica del script evitan tildes y caracteres especiales para garantizar la máxima compatibilidad en cualquier entorno de terminal o sistema operativo.

## **3\. Formas de Uso y Ventanas Temporales**

El script permite parametrizar las ventanas de consulta mediante argumentos por consola:

| Bandera / Parámetro | Tipo de Ventana Temporal | Comando de Ejemplo   |
| :---- | :---- | :---- |
| \--5h | Últimas 5 horas móviles desde el momento exacto de ejecución. | node scripts/informe-cuota.js \--5h |
| \--dia | Día natural actual (desde las 00:00:00 local hasta la hora actual). | node scripts/informe-cuota.js \--dia |
| \--desde=YYYY-MM-DD | Rango acumulado desde una fecha fija inicial hasta la actualidad. | node scripts/informe-cuota.js \--desde=2026-09-01 |
| \--hist5h=N | Genera *N* bloques fijos de 5 horas alineados en UTC (e.g., 00:00, 05:00, 10:00). | node scripts/informe-cuota.js \--hist5h=3 |
| \--db=... | Ruta personalizada a la base opencode.db (Default: \~/.local/share/opencode/opencode.db). | node scripts/informe-cuota.js \--db=/ruta/custom/opencode.db |
| \--dir=... | Filtro de nombre/directorio del proyecto (Default: exploraco). | node scripts/informe-cuota.js \--dir=exploraco |
| \--out=... | Directorio de destino para la salida en Markdown (Default: exploraco desarrollo/informes-cuota). | node scripts/informe-cuota.js \--out=mis-informes |

## **4\. Estructura Actual de los Informes Generados**

Cada reporte Markdown exportado (cuota-YYYY-MM-DD-\*.md) cuenta con la siguiente arquitectura de secciones:

> 1. **Cabecera y Metadatos:** Fecha/hora de generación, ventana temporal evaluada, ruta de la base de datos y resumen general de sesiones/mensajes.  
> 2. **Resumen General (Sesiones):** Muestreo global de costo total ($ USD), tokens de entrada, tokens de salida, tokens de razonamiento (*reasoning*) y lectura/escritura en caché.  
> 3. **Desglose por Modelo (Sesiones):** Consumo agrupado por el modelo e identificador de variante empleado (ej. deepseek-v4-flash \[high\]).  
> 4. **Uso por Subagente (Mensajes):** Métricas agregadas por rol o agente (build, plan, explore, etc.).  
> 5. **Matriz Subagente x Modelo (Mensajes):** Relación cruzada entre qué agente consumió qué modelo específico.  
> 6. **Top 5 Sesiones por Costo:** Clasificación de las 5 sesiones con mayor impacto económico en la ventana.

## **5\. Anotaciones de Desarrollo y Optimización Futura**

### **5.1 Recomendación de Mejora: Desglose y Descripción Detallada de Tareas**

Para elevar la efectividad del sistema de auditoría y habilitar políticas directas de optimización de costos, se establece la siguiente directiva de desarrollo:  
**Requerimiento:** Los informes deben incorporar un desglose específico de las *tareas realizadas* dentro de cada sesión o subagente, acompañado de una *descripción clara de cada tarea*.

#### **Motivación e Impacto:**

> * **Identificación de Fugas de Presupuesto:** Conocer el costo global de un subagente (ej. build gastando $1.68) no revela qué prompt o refactorización específica provocó el pico. El desglose por tarea permitirá responder a la pregunta: *"¿En qué prompt o prompt loop específico se está gastando más dinero?"*.  
> * **Detección de Tareas Ineficientes:** Permitirá identificar tareas repetitivas o ciclos de corrección de código que consumen un alto volumen de tokens de salida o razonamiento sin aportar valor significativo.  
> * **Estrategias de Optimización Reducida:** Facilitará decisiones técnicas como:  
  * Migrar tareas de exploración o mapeo (ej. explore) a modelos más ligeros o locales.  
  * Ajustar las instrucciones del sistema (\*system prompts\*) en tareas de planificación (plan) cuando la descripción de la tarea muestre un consumo excesivo de tokens de entrada por exceso de contexto.

#### **Sugerencia de Implementación Técnica en informe-cuota.js:**

> * Extraer del campo JSON message.data (o de las tablas de tareas asociadas a la sesión) el primer mensaje del usuario, la intención/summary del subagente o la herramienta invocada (e.g., tool\_use).  
> * Añadir una nueva sección en el reporte Markdown titulada \#\# Desglose Detallado de Tareas y Prompts de Alto Consumo, incluyendo una tabla con:  
  * **Sesión / Tarea:** Título o identificador de la tarea.  
  * **Descripción de la Tarea:** Resumen del objetivo o prompt ejecutado.  
  * **Subagente / Modelo:** Entidad que ejecutó la instrucción.  
  * **Costo ($) y Tokens:** Desglose preciso del impacto económico de dicha tarea.