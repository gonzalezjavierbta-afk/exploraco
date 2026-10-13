---
description: Verifica y deja en $0 la sesion actual antes de empezar a trabajar.
agent: build
---

TAREA SESION $0. No ejecutes nada todavia.

1. La salida del guard va pegada debajo. Leela y resume en UNA linea: modelo activo, tier, tokens de contexto.
2. Si el tier NO es FREE: NO trabajes. Informa del modelo activo exacto, recuerda el unico gratis verificado para primario y subagentes ("opencode/space-bunny-free"), y pide que lo elija en el selector. Despues repite este comando y confirma el tier FREE.
3. Si el tier es FREE: confirma el tier, recuerda que al modelo activo lo heredan los subagentes, y sigue la cascada de coste vigente.
4. Si el tier es ROTO_CATALOGO o ROTO_SUBAGENTE: informa del motivo literal medido y para.

Salida del guard:

!`node scripts/ejecucion/verificar-capa-gratis.js --preflight`
