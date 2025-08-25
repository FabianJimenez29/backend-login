import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase con valores explícitos para depuración
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bazixgggnwpswkxwaete.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheml4Z2dnbndwc3dreHdhZXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjEzODEsImV4cCI6MjA3MTUzNzM4MX0.VwA5elZYp_YreG7oo68eaf83UaNhtwQMTugAd8D9cTo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Recopilar información de diagnóstico
    const diagnosticInfo = {
      supabaseConnection: {
        url: SUPABASE_URL,
        keyLength: SUPABASE_KEY.length,
        keyType: SUPABASE_KEY.includes('service_role') ? 'service_role' : 'anon'
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      tests: {}
    };
    
    // Test 1: Listar buckets
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        diagnosticInfo.tests.listBuckets = {
          success: false,
          error: bucketsError.message,
          code: bucketsError.code
        };
      } else {
        diagnosticInfo.tests.listBuckets = {
          success: true,
          buckets: buckets.map(b => b.name),
          count: buckets.length
        };
      }
    } catch (error) {
      diagnosticInfo.tests.listBuckets = {
        success: false,
        error: error.message,
        type: 'exception'
      };
    }
    
    // Test 2: Verificar si el bucket 'promociones' existe
    if (diagnosticInfo.tests.listBuckets.success) {
      const bucketExists = diagnosticInfo.tests.listBuckets.buckets.includes('promociones');
      diagnosticInfo.tests.bucketExists = {
        success: true,
        exists: bucketExists
      };
      
      // Test 2.1: Si no existe, intentar crearlo
      if (!bucketExists) {
        try {
          const { data: newBucket, error: createError } = await supabase
            .storage
            .createBucket('promociones', { public: true });
            
          diagnosticInfo.tests.createBucket = {
            attempted: true,
            success: !createError,
            error: createError ? createError.message : null
          };
        } catch (error) {
          diagnosticInfo.tests.createBucket = {
            attempted: true,
            success: false,
            error: error.message,
            type: 'exception'
          };
        }
      }
    }
    
    // Test 3: Si el bucket existe o se creó, listar archivos
    if ((diagnosticInfo.tests.bucketExists && diagnosticInfo.tests.bucketExists.exists) || 
        (diagnosticInfo.tests.createBucket && diagnosticInfo.tests.createBucket.success)) {
      try {
        const { data: files, error: filesError } = await supabase
          .storage
          .from('promociones')
          .list('', {
            sortBy: { column: 'name', order: 'asc' }
          });
          
        diagnosticInfo.tests.listFiles = {
          success: !filesError,
          error: filesError ? filesError.message : null,
          files: files ? files.map(f => f.name) : [],
          count: files ? files.length : 0
        };
      } catch (error) {
        diagnosticInfo.tests.listFiles = {
          success: false,
          error: error.message,
          type: 'exception'
        };
      }
    }
    
    // Test 4: Verificar permisos de carga de archivos
    try {
      // Intentar cargar un pequeño archivo de prueba
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test-file-delete-me.txt', { type: 'text/plain' });
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('promociones')
        .upload('test-file-delete-me.txt', testBlob, {
          cacheControl: '3600',
          upsert: true
        });
        
      diagnosticInfo.tests.uploadTest = {
        attempted: true,
        success: !uploadError,
        error: uploadError ? uploadError.message : null,
        path: uploadData ? uploadData.path : null
      };
      
      // Si se cargó correctamente, eliminarlo
      if (!uploadError) {
        const { error: deleteError } = await supabase
          .storage
          .from('promociones')
          .remove(['test-file-delete-me.txt']);
          
        diagnosticInfo.tests.deleteTest = {
          success: !deleteError,
          error: deleteError ? deleteError.message : null
        };
      }
    } catch (error) {
      diagnosticInfo.tests.uploadTest = {
        attempted: true,
        success: false,
        error: error.message,
        type: 'exception'
      };
    }
    
    // Generar diagnóstico y recomendaciones
    diagnosticInfo.overallStatus = 
      diagnosticInfo.tests.listBuckets.success ? 'Connected to Supabase' : 'Failed to connect to Supabase';
    
    diagnosticInfo.recommendations = [];
    
    if (!diagnosticInfo.tests.listBuckets.success) {
      diagnosticInfo.recommendations.push('Verify Supabase URL and API key in environment variables');
    }
    
    if (diagnosticInfo.tests.bucketExists && !diagnosticInfo.tests.bucketExists.exists && 
       diagnosticInfo.tests.createBucket && !diagnosticInfo.tests.createBucket.success) {
      diagnosticInfo.recommendations.push('Create "promociones" bucket manually in Supabase dashboard');
    }
    
    if (diagnosticInfo.tests.uploadTest && !diagnosticInfo.tests.uploadTest.success) {
      diagnosticInfo.recommendations.push('Check storage permissions in Supabase dashboard');
    }
    
    return res.status(200).json(diagnosticInfo);
  } catch (error) {
    console.error('Error general:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
}
