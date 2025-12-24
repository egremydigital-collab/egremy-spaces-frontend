import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =========================================================
// PROMPT MAESTRO EGREMY v4 - GUARDRAILS FINALES
// =========================================================

const buildSystemPrompt = (riskLevel: string = "medio") => `Eres el "Egremy Social Engine 2025", un sistema experto en creación de contenido viral para Instagram Reels y TikTok.

## TU MISIÓN
Crear guiones PSP (Problema-Solución-Prueba) que:
- Detengan el scroll en los primeros 3 segundos
- Generen conexión emocional genuina
- Conviertan viewers en leads calificados

## MÉTRICAS QUE OPTIMIZAS
1. **Retención** - Watch time completo
2. **Sends** - Compartidos por DM (la métrica más valiosa 2025)
3. **Saves** - Guardados para ver después
4. **Leads** - Conversiones a DM/WhatsApp

## ⚠️ GUARDRAILS OBLIGATORIOS - CLAIMS SENSIBLES

### Aplica a nichos de: SALUD, ESTÉTICA, ALIMENTOS, DINERO/INVERSIONES, SUPLEMENTOS

### PROHIBIDO (sin excepción):
- ❌ Citar autoridades sin fuente: "dermatólogos dicen", "expertos recomiendan", "estudios demuestran"
- ❌ Porcentajes inventados: "90% de mejora", "80% de clientes", "3x más resultados"
- ❌ Promesas de tiempo: "en 4 semanas", "resultados en 30 días", "verás cambios en X tiempo"
- ❌ Garantías absolutas: "garantizado", "100% efectivo", "siempre funciona"
- ❌ Claims médicos/financieros: "cura", "elimina", "ganancias aseguradas"

### OBLIGATORIO (siempre usar):
- ✅ Lenguaje seguro: "muchas personas han experimentado", "en nuestra experiencia"
- ✅ Disclaimers implícitos: "los resultados pueden variar", "cada caso es diferente"
- ✅ Prueba social cualitativa: "clientes satisfechos", "historias reales", "transformaciones"
- ✅ Rangos en lugar de absolutos: "algunas personas notan cambios en pocas semanas"

## 🎯 HOOK UNIQUENESS - ANTI-PLANTILLA (OBLIGATORIO)

Cuando el hook contenga placeholders como [acción incorrecta], [tema], [profesión], [nicho], etc.:
- **SIEMPRE** reemplázalos con ejemplos ESPECÍFICOS y CONCRETOS del nicho
- El hook final debe sonar natural, conversacional, NO como plantilla
- Usar lenguaje del día a día del nicho específico
- Si el placeholder es genérico, crear un ejemplo memorable y específico

### Ejemplos de transformación:
- MALO: "Estás tirando dinero si [acción incorrecta]"
- BUENO: "Estás tirando dinero si compras cremas antiarrugas en el supermercado"

- MALO: "POV: Eres [profesión] y [situación]"
- BUENO: "POV: Eres bailarina de hip-hop y tu outfit se rompe en plena batalla"

- MALO: "¿Por qué nadie habla de [tema]?"
- BUENO: "¿Por qué nadie habla de que el 80% de los mariscos se sirven congelados?"

## 🎚️ NIVEL DE RIESGO CREATIVO: ${riskLevel.toUpperCase()}

${riskLevel === "bajo" ? `
### MODO CONSERVADOR (risk_level: bajo)
- NO usar shock marketing ni declaraciones controversiales
- Evitar palabras negativas fuertes: "asco", "terrible", "estafa"
- Tono educativo y positivo
- Claims suaves y seguros
- CTAs amigables, no urgentes
- Ideal para: marcas corporativas, profesionales de salud, B2B
` : riskLevel === "alto" ? `
### MODO AGRESIVO (risk_level: alto)
- SE PERMITE shock marketing controlado
- Puedes usar declaraciones controversiales que generen debate
- Tono directo y confrontativo permitido
- Pattern interrupts fuertes
- Urgencia agresiva en CTAs
- Ideal para: marcas disruptivas, nichos competitivos, audiencias jóvenes
- ⚠️ MANTENER guardrails de claims sensibles (sin promesas falsas)
` : `
### MODO BALANCEADO (risk_level: medio) - DEFAULT
- Declaraciones que generen curiosidad sin ser ofensivas
- Tono conversacional con edge
- Pattern interrupts moderados
- CTAs con urgencia sutil
- Balance entre engagement y profesionalismo
`}

## REGLAS DE ESCRITURA
- Frases cortas y punchy (máximo 12 palabras por oración)
- Lenguaje conversacional, como si hablaras con un amigo
- Evita jerga corporativa o frases genéricas
- Incluye pausas dramáticas marcadas con "..."
- El hook debe crear un "pattern interrupt" mental
- NUNCA dejes placeholders sin rellenar en el output final

## ESTRUCTURA PSP DETALLADA

### HOOK (0-3s)
- Debe generar curiosidad o tensión inmediata
- Incluir la palabra "tú" o "tu" para personalizar
- DEBE estar completamente adaptado al nicho (sin placeholders)
- Ajustar agresividad según risk_level

### PROBLEMA (3-8s)
- Agitar el dolor SIN ser negativo destructivo
- Validar que el problema es real y común
- Crear el "yo también" moment
- Para nichos sensibles: enfocarse en frustración, NO en condiciones específicas

### SOLUCIÓN (8-35s)
- UN solo insight poderoso (no una lista)
- Mostrar el "cómo" de forma simple
- Usar analogías o metáforas memorables
- Estilo founder-led: experiencia personal > teoría
- Para nichos sensibles: enfocarse en EXPERIENCIA y PROCESO

### PRUEBA + CTA (Final)
- Prueba social CUALITATIVA (historias, satisfacción)
- NUNCA usar porcentajes inventados
- CTA ajustado al risk_level
- Urgencia según nivel de riesgo

## FORMATO DE RESPUESTA (JSON)
{
  "script_psp": {
    "hook": {
      "time": "0-3s",
      "text": "Texto exacto (SIN placeholders)",
      "visual_action": "Qué mostrar en pantalla",
      "pattern_interrupt": "Técnica usada"
    },
    "problem": {
      "time": "3-8s",
      "text": "Texto exacto",
      "validation": "Cómo validar identificación",
      "emotion": "Emoción principal"
    },
    "solution": {
      "time": "8-35s",
      "text": "Texto exacto",
      "key_insight": "Insight central",
      "analogy": "Analogía o metáfora",
      "visual_demo": "Demostración visual"
    },
    "proof_cta": {
      "time": "final",
      "proof": "Prueba social CUALITATIVA",
      "cta": "Llamado a acción",
      "urgency_element": "Elemento de urgencia"
    }
  },
  "production_pack": {
    "screen_text": ["Textos en pantalla"],
    "text_timing": ["Tiempos"],
    "cut_rhythm": "Patrón de cortes",
    "visual_style": "Estilo visual",
    "b_roll_suggestions": ["Ideas B-roll"],
    "music_mood": "Mood musical"
  },
  "seo_pack": {
    "audio_keywords": ["Keywords audio"],
    "caption": "Caption optimizado",
    "hashtags": ["Hashtags"],
    "alt_text": "Alt text",
    "best_posting_time": "Mejor hora"
  },
  "advanced_optimizations": ["Optimizaciones"],
  "ab_test_variants": {
    "hook_variant": "Hook alternativo",
    "cta_variant": "CTA alternativo"
  },
  "compliance_check": {
    "health_claims_safe": true,
    "no_false_promises": true,
    "placeholders_filled": true,
    "risk_level_applied": "${riskLevel}"
  }
}

IMPORTANTE: 
1. Responde ÚNICAMENTE con el JSON, sin texto antes o después.
2. NUNCA dejes placeholders tipo [xxx] en el output.
3. En nichos sensibles, SIEMPRE usa lenguaje seguro.
4. Ajusta el tono según el risk_level indicado.`;

// =========================================================
// GOLDEN RUNS - TEMPLATES OFICIALES
// =========================================================

const GOLDEN_RUNS = {
  "estetica-leads": {
    name: "Clínica Estética - Leads",
    niche: "Clínica estética facial",
    pillar: "Tratamientos anti-edad",
    objective: "Leads",
    awareness: "Tibio",
    duration: "30-60",
    platform: "IG",
    language: "ES",
    cta_dest: "DM",
    suggested_hook: "E12",
    risk_level: "medio"
  },
  "restaurante-sends": {
    name: "Restaurante Premium - Sends",
    niche: "Restaurante de mariscos premium",
    pillar: "Experiencia gastronómica",
    objective: "Sends",
    awareness: "Frio",
    duration: "7-15",
    platform: "IG",
    language: "ES",
    cta_dest: "Reservación",
    suggested_hook: "C03",
    risk_level: "alto"
  },
  "bailarinas-reach": {
    name: "Ropa Bailarinas - Reach",
    niche: "Ropa urbana para bailarinas de hip-hop y dancehall",
    pillar: "Estilo y comodidad para el baile",
    objective: "Reach",
    awareness: "Frio",
    duration: "7-15",
    platform: "TT",
    language: "ES",
    cta_dest: "Seguir",
    suggested_hook: "I05",
    risk_level: "alto"
  }
};

// =========================================================
// CONFIGURACIÓN DE MODELOS
// =========================================================

const MODEL_CONFIG: Record<string, { provider: string; model: string; temperature: number; top_p: number }> = {
  "gpt-4.1": { provider: "openai", model: "gpt-4.1", temperature: 0.6, top_p: 0.9 },
  "gpt-4o": { provider: "openai", model: "gpt-4o", temperature: 0.6, top_p: 0.9 },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini", temperature: 0.6, top_p: 0.9 },
  "gpt-4.5": { provider: "openai", model: "gpt-4.5-preview", temperature: 0.6, top_p: 0.9 },
  "claude-opus-4": { provider: "anthropic", model: "claude-opus-4-20250514", temperature: 0.6, top_p: 0.9 },
  "claude-sonnet-4": { provider: "anthropic", model: "claude-sonnet-4-20250514", temperature: 0.6, top_p: 0.9 },
};

const DEFAULT_MODEL = "gpt-4.1";

// =========================================================
// FUNCIONES DE IA
// =========================================================

async function callOpenAI(prompt: string, systemPrompt: string, modelConfig: { model: string; temperature: number; top_p: number }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: modelConfig.temperature,
      top_p: modelConfig.top_p,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`OpenAI Error: ${data.error.message}`);
  }
  
  return JSON.parse(data.choices[0].message.content);
}

async function callAnthropic(prompt: string, systemPrompt: string, modelConfig: { model: string; temperature: number; top_p: number }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelConfig.model,
      max_tokens: 4096,
      temperature: modelConfig.temperature,
      top_p: modelConfig.top_p,
      system: systemPrompt,
      messages: [
        { role: "user", content: prompt }
      ],
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Anthropic Error: ${data.error.message}`);
  }
  
  const content = data.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error("No se pudo extraer JSON de la respuesta");
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function generateWithAI(prompt: string, systemPrompt: string, modelKey: string) {
  const config = MODEL_CONFIG[modelKey] || MODEL_CONFIG[DEFAULT_MODEL];
  
  if (config.provider === "anthropic") {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
    return await callAnthropic(prompt, systemPrompt, config);
  } else {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    return await callOpenAI(prompt, systemPrompt, config);
  }
}

// =========================================================
// FUNCIONES DE BASE DE DATOS
// =========================================================

async function getFilteredHooks(supabase: ReturnType<typeof createClient>, objective: string, awareness: string, duration: string) {
  let { data: hooks } = await supabase
    .from("hooks")
    .select("*")
    .eq("objective", objective)
    .eq("awareness", awareness)
    .eq("duration", duration)
    .eq("is_active", true);

  if (!hooks || hooks.length < 3) {
    const { data: relaxed } = await supabase
      .from("hooks")
      .select("*")
      .eq("objective", objective)
      .eq("is_active", true);
    hooks = relaxed;
  }

  return hooks || [];
}

function selectTopHooks(hooks: Record<string, unknown>[], count: number = 3) {
  const categories = [...new Set(hooks.map((h) => h.category))];
  const selected: Record<string, unknown>[] = [];

  for (const cat of categories) {
    if (selected.length >= count) break;
    const hookFromCat = hooks.find((h) => h.category === cat && !selected.includes(h));
    if (hookFromCat) selected.push(hookFromCat);
  }

  for (const hook of hooks) {
    if (selected.length >= count) break;
    if (!selected.includes(hook)) selected.push(hook);
  }

  return selected.slice(0, count);
}

// =========================================================
// DETECCIÓN DE NICHOS SENSIBLES
// =========================================================

function isSensitiveNiche(niche: string): boolean {
  const sensitiveKeywords = [
    "salud", "médic", "clínica", "estétic", "doctor", "dermat",
    "nutrición", "dieta", "peso", "adelgaz", "fitness",
    "inversión", "dinero", "trading", "crypto", "financ",
    "restaurante", "comida", "alimento", "gastro",
    "suplemento", "vitamina", "natural", "orgánic",
    "dental", "odonto", "psicolog", "terap"
  ];
  
  const nicheLower = niche.toLowerCase();
  return sensitiveKeywords.some(keyword => nicheLower.includes(keyword));
}

// =========================================================
// HANDLER PRINCIPAL
// =========================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // =========================================================
    // AUTENTICACIÓN CORRECTA: Usar el token del request
    // =========================================================
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization")!,
        },
      },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid or missing token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Cliente con service role para operaciones de DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const input = await req.json();
    const userId = user.id;
    
    // Endpoint especial: obtener Golden Runs
    if (input.get_golden_runs) {
      return new Response(
        JSON.stringify({ golden_runs: GOLDEN_RUNS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar acceso al proyecto
    const { data: membership } = await supabase
      .from("se_project_members")
      .select("role")
      .eq("project_id", input.project_id)
      .eq("user_id", userId)
      .single();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "No access to this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configuración
    const aiModel = input.ai_model || DEFAULT_MODEL;
    const riskLevel = input.risk_level || "medio";
    const systemPrompt = buildSystemPrompt(riskLevel);
    const sensitiveNiche = isSensitiveNiche(input.niche || "");

    // PASO 1: Si no hay hook seleccionado, devolver 3 sugerencias
    if (!input.selected_hook_code) {
      const hooks = await getFilteredHooks(supabase, input.objective, input.awareness, input.duration);
      const topHooks = selectTopHooks(hooks, 3);

      const suggestedHooks = topHooks.map((hook: Record<string, unknown>) => ({
        code: hook.code,
        text: input.language === "EN" ? hook.hook_en : hook.hook_es,
        category: hook.category,
        tip: hook.tip,
        why: `Optimizado para ${input.objective} con audiencia ${input.awareness}`,
      }));

      return new Response(
        JSON.stringify({ 
          step: "SELECT_HOOK", 
          suggested_hooks: suggestedHooks,
          available_models: Object.keys(MODEL_CONFIG),
          golden_runs: Object.keys(GOLDEN_RUNS),
          risk_levels: ["bajo", "medio", "alto"],
          sensitive_niche_detected: sensitiveNiche
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PASO 2: Generar contenido con el hook elegido
    const { data: selectedHook } = await supabase
      .from("hooks")
      .select("*")
      .eq("code", input.selected_hook_code)
      .single();

    if (!selectedHook) throw new Error("Hook not found");

    const hookText = input.language === "EN" ? selectedHook.hook_en : selectedHook.hook_es;

    const userPrompt = `
## CONTEXTO DEL CONTENIDO

**Nicho:** ${input.niche}
**Pilar de contenido:** ${input.pillar}
**Objetivo algorítmico:** ${input.objective}
**Nivel de consciencia de la audiencia:** ${input.awareness}
**Duración objetivo:** ${input.duration} segundos
**Plataforma:** ${input.platform === "IG" ? "Instagram Reels" : input.platform === "TT" ? "TikTok" : "Instagram Reels y TikTok"}
**Idioma:** ${input.language === "ES" ? "Español (México/Latinoamérica)" : "Inglés"}
**CTA destino:** ${input.cta_dest || "DM"}
**Nivel de riesgo creativo:** ${riskLevel.toUpperCase()}
${input.keyword ? `**Palabra clave principal:** ${input.keyword}` : ""}

## HOOK SELECCIONADO

- **Código:** ${selectedHook.code}
- **Template:** ${hookText}
- **Categoría:** ${selectedHook.category}
- **Tip de uso:** ${selectedHook.tip}

## TU TAREA

Genera un guion PSP completo y detallado.

⚠️ REGLAS CRÍTICAS:
1. Si el hook tiene placeholders como [acción incorrecta], [tema], etc., DEBES reemplazarlos con ejemplos ESPECÍFICOS del nicho "${input.niche}".
2. El hook final debe sonar NATURAL y ESPECÍFICO, no como plantilla.
3. Ajusta el tono según el risk_level: ${riskLevel}.
${sensitiveNiche ? `4. ⚠️ NICHO SENSIBLE DETECTADO: Aplica TODOS los guardrails de claims sensibles. NO uses porcentajes, promesas de tiempo, ni cites autoridades.` : ""}

Responde ÚNICAMENTE con el JSON estructurado.
`;

    // Llamar al modelo de IA
    const aiResponse = await generateWithAI(userPrompt, systemPrompt, aiModel);

    // Guardar el run
    const { data: run } = await supabase
      .from("se_content_runs")
      .insert({
        project_id: input.project_id,
        mode: input.mode || "TEAM",
        niche: input.niche,
        pillar: input.pillar,
        objective: input.objective,
        awareness: input.awareness,
        duration: input.duration,
        platform: input.platform,
        language: input.language,
        cta_dest: input.cta_dest,
        selected_hook_code: input.selected_hook_code,
        script_psp: aiResponse.script_psp,
        production_pack: aiResponse.production_pack,
        seo_pack: aiResponse.seo_pack,
        advanced_optimizations: aiResponse.advanced_optimizations,
        created_by: userId,
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        step: "COMPLETE",
        run_id: run?.id,
        ai_model_used: aiModel,
        risk_level_applied: riskLevel,
        sensitive_niche: sensitiveNiche,
        hook: { code: selectedHook.code, text: hookText, category: selectedHook.category },
        ...aiResponse,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
