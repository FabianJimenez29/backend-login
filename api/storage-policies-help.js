import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase - idealmente usar una clave de servicio para esta operación
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bazixgggnwpswkxwaete.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheml4Z2dnbndwc3dreHdhZXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjEzODEsImV4cCI6MjA3MTUzNzM4MX0.VwA5elZYp_YreG7oo68eaf83UaNhtwQMTugAd8D9cTo';

// Crear cliente de Supabase con opciones seguras
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Este endpoint proporciona información sobre la configuración de Supabase Storage
  // y cómo configurar correctamente las políticas de acceso
  
  try {
    // 1. Comprobar tipo de clave usada
    const keyType = SUPABASE_KEY.includes('service_role') ? 'service_role' : 'anon';
    
    // 2. Verificar conexión básica listando buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return res.status(500).json({
        success: false,
        error: 'Error al conectar con Supabase Storage',
        details: bucketsError.message,
        keyType: keyType,
        recommendation: keyType === 'anon' ? 
          'Estás usando una clave anónima. Para administrar buckets necesitas una clave de servicio (service_role).' :
          'Verifica que la clave tenga permisos para Storage y que las variables de entorno sean correctas.'
      });
    }
    
    // 3. Recopilar información sobre buckets existentes
    const bucketList = buckets.map(b => b.name);
    const hasPromocionesBucket = bucketList.includes('promociones');
    
    // 4. Instrucciones para configurar las políticas según si tenemos clave de servicio
    const configurationInstructions = {
      step1: "Inicia sesión en tu dashboard de Supabase: https://app.supabase.com",
      step2: "Selecciona tu proyecto",
      step3: "Ve a 'Storage' en el menú de la izquierda",
      step4: "Si no existe el bucket 'promociones', créalo manualmente con el botón 'New Bucket'",
      step5: "Haz clic en el bucket 'promociones'",
      step6: "Ve a la pestaña 'Policies' (en la parte superior)",
      step7: "Agrega estas políticas:",
      policies: [
        {
          name: "Acceso de lectura público para todos",
          definition: "Permitir SELECT para anon",
          policyStatement: "Policy: SELECT, Definition: true"
        },
        {
          name: "Acceso de escritura para usuarios autenticados",
          definition: "Permitir INSERT, UPDATE, DELETE para usuarios autenticados",
          policyStatement: "Policy: INSERT/UPDATE/DELETE, Definition: authenticated = true"
        }
      ],
      step8: "Después de configurar las políticas, puedes subir imágenes a través del dashboard de Supabase"
    };

    // 5. Devolver toda la información recopilada
    return res.status(200).json({
      success: true,
      connection: {
        status: 'connected',
        url: SUPABASE_URL,
        keyType: keyType
      },
      storage: {
        buckets: bucketList,
        hasPromocionesBucket: hasPromocionesBucket,
        totalBuckets: bucketList.length
      },
      howToConfigurePolicies: configurationInstructions,
      status: hasPromocionesBucket ? 
        'El bucket promociones existe, solo necesita configurar las políticas correctamente' :
        'El bucket promociones no existe, debe crearlo y configurar las políticas',
      nextStep: keyType === 'service_role' ?
        'Con esta clave de servicio, puede usar el endpoint /api/setup-bucket para intentar configurar automáticamente el bucket y las políticas' :
        'Siga las instrucciones para configurar manualmente el bucket y las políticas en el dashboard de Supabase'
    });
    
  } catch (error) {
    console.error('Error inesperado:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}
