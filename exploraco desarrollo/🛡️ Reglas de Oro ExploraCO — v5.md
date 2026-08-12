**🛡️ Reglas de Oro ExploraCO — v5.202607 (REFORZADAS)**  
**Estado:** Integridad Total Restablecida · Protocolo ASCII-Safe Activo · Blindaje de Precisión Quirúrgica.  
**1\. Mandato de Integridad ASCII-Safe (CRÍTICO)**  
Debido a la arquitectura serverless de Vercel Hobby, los archivos en `api/*.js` tienen tolerancia cero a caracteres especiales.

* **Regla:** Prohibido el uso de caracteres \> 127, tildes, "ñ", emojis directos o comillas invertidas (backticks `` ` ``) en el backend.  
* **Protocolo de Escapes:** Usar exclusivamente escapes Unicode simples (ej: `\u00f1` para la ñ). El uso de doble escape (`\\uXXXX`) es un bug.

**2\. Protocolo de Edición Estructural vía Python**  
Dada la complejidad de `admin.html` (\~7,500 líneas), no se permiten ediciones manuales masivas.

* **Regla:** Las modificaciones en archivos HTML grandes deben realizarse mediante scripts de **Python** usando `str.replace()` con coincidencias exactas.  
* **Verificación de Balance:** Es obligatorio validar el **balance de etiquetas** \<div\> y el cierre de comentarios `<!-- -->` antes de cada entrega.

**3\. Persistencia de Datos JSONB (Protocolo Merge)**

* **Regla de No-Reemplazo:** Los endpoints de actualización deben realizar un **MERGE** de datos (operador `||` en SQL) en lugar de un reemplazo total.  
* **Cero Borrado Lógico:** Los IDs lógicos del contrato de datos (ej: `#db-lineup`) deben permanecer en el código aunque no sean visibles.

**4\. Aislamiento Atómico de Estilos (ATOMIC)**

* **Scoped CSS:** Todo el CSS debe vivir bajo un selector padre único (ej: `.cat-sitio`) e iniciar con un "Reset de Silo" para neutralizar márgenes heredados.

**5\. Contrato de Interactividad Física**

* **Regla:** Elementos que requieran acción (FAQ, tabs, formularios) deben incluir el atributo `onclick` inyectado físicamente en el HTML por el servidor.

**6\. Escudo de Auditoría GOLD**  
Certificar la inyección mediante los 5 latidos de salud en consola: **INFO** (visibilidad), **DEBUG** (versión/baseline), **LINK** (CSS), **TRACE** (mapeo cuantitativo JSONB) y **TIME** (sincronía).  
**7\. Estándares Visuales Premium**

* **Protocolo SVG:** Prohibido el uso de fuentes de iconos externas. Usar etiquetas `<svg>` íntegras.  
* **Tipografía Estricta:** **Barlow Condensed** para títulos y **Geist 900** para valores numéricos e indicadores técnicos.

**8\. Protocolo de Entrega (Handoff)**

* **Referencia de Verdad:** Antes de proponer cambios, la IA debe solicitar el archivo más reciente del repositorio de Javier para evitar alucinaciones del historial.

**9\. Protocolo de Entrega de Código Quirúrgico (NUEVA)**  
Para garantizar una integración sin errores de lógica ni sintaxis:

* **Segmentos Completos:** Entregar el bloque de código más completo posible para no alterar la lógica interna \[Conversación previa, Turn 16\].  
* **Marcación de Puntos:** Indicar claramente el **punto de entrada** (con las últimas 3 líneas antes del cambio) y el **punto final** (con las 3 líneas posteriores al cambio) \[Conversación previa, Turn 16\].  
* **Línea Referencial:** Especificar la ubicación aproximada del número de línea para facilitar la búsqueda en archivos grandes \[Conversación previa, Turn 16\].

**10\. Mandato de Indagación de Claude (NUEVA)**

* **Regla:** Todo prompt o paquete de instrucciones entregado a Claude debe cerrar obligatoriamente con la instrucción: **"hacer las preguntas necesarias para completar la tarea de la mejor forma posible"** \[340, 388, Conversación previa\].

