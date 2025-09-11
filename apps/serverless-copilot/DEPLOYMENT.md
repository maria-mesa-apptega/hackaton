# 🚀 Apptega Compliance Copilot - Deployment Guide

Este documento proporciona instrucciones completas para desplegar el Apptega Compliance Copilot en AWS usando Serverless Framework.

## 📋 Prerrequisitos

### Herramientas Requeridas
- **Node.js** 18.x o superior
- **npm** 8.x o superior
- **AWS CLI** configurado con credenciales válidas
- **Serverless Framework** (se instala automáticamente si no está disponible)

### Verificar Prerrequisitos
```bash
# Verificar versiones
node --version    # Debe ser >= 18.0.0
npm --version     # Debe ser >= 8.0.0
aws --version     # Debe estar instalado

# Verificar credenciales AWS
aws sts get-caller-identity
```

## ⚙️ Configuración Inicial

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd apptega-compliance-copilot
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno

Copia el archivo de plantilla y configura las variables:
```bash
cp env-template.txt .env
```

**Variables críticas que debes configurar:**
```bash
# AWS Configuration
AWS_REGION=us-east-1

# Bedrock Configuration
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# Database Configuration
MYSQL_HOST=your-mysql-host
MYSQL_USERNAME=your-mysql-user
MYSQL_PASSWORD=your-mysql-password

# API Keys
APPTEGA_API_KEY=your-apptega-api-key
JWT_SECRET=your-jwt-secret-minimum-32-chars
```

### 4. Configurar AWS Credentials para Bedrock

**⚠️ IMPORTANTE**: AWS Bedrock requiere credenciales válidas para funcionar. Tienes 3 opciones:

#### Opción 1: Credenciales Directas (Desarrollo/Testing)
```bash
# En tu archivo .env
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
```

#### Opción 2: AWS CLI Profile
```bash
# Configurar AWS CLI
aws configure --profile apptega-copilot
# Seguir prompts para access key, secret key, region

# En tu archivo .env
AWS_PROFILE=apptega-copilot
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
```

#### Opción 3: IAM Role (Producción en AWS)
```bash
# Para deployment en Lambda, no se necesitan credenciales explícitas
# El rol de Lambda debe tener permisos para:
# - bedrock:InvokeModel
# - bedrock:GetFoundationModel
# - bedrock:ListFoundationModels

# En serverless.yml se configura automáticamente:
# iamRoleStatements:
#   - Effect: Allow
#     Action:
#       - bedrock:InvokeModel
#       - bedrock:GetFoundationModel
#       - bedrock:ListFoundationModels
#     Resource: "*"
```

#### Permisos Requeridos para Bedrock
Tu usuario/rol AWS debe tener estos permisos mínimos:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:GetFoundationModel",
                "bedrock:ListFoundationModels"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🚀 Deployment

### Deployment Automático (Recomendado)
```bash
# Deployment a desarrollo
./scripts/deploy.sh dev us-east-1

# Deployment a producción
./scripts/deploy.sh prod us-east-1
```

### Deployment Manual
```bash
# Instalar dependencias
npm ci

# Ejecutar linting y tests
npm run lint
npm run type-check
npm test

# Build del proyecto
npm run build

# Deploy con Serverless
npx serverless deploy --stage dev --region us-east-1
```

### Deployment por Etapas
```bash
# Solo desarrollo
npm run deploy:dev

# Solo producción
npm run deploy:prod

# Deploy de una función específica
serverless deploy function -f ask --stage dev
```

## 🧪 Testing Post-Deployment

### Testing Automático
```bash
# Ejecutar todos los tests
./scripts/test-api.sh https://your-api-endpoint.amazonaws.com/dev

# Con API Key
./scripts/test-api.sh https://your-api-endpoint.amazonaws.com/dev your-api-key
```

### Testing Manual

#### 1. Health Check
```bash
curl -X GET https://your-api-endpoint.amazonaws.com/dev/health/ping
```

#### 2. AI Models
```bash
curl -X GET https://your-api-endpoint.amazonaws.com/dev/ai/models
```

#### 3. Compliance Ask
```bash
curl -X POST https://your-api-endpoint.amazonaws.com/dev/compliance/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cómo implementar MFA para NIST CSF?",
    "userId": "demo-user-1",
    "organizationId": 1,
    "context": {
      "currentFramework": "NIST_CSF_V1_1",
      "userRole": "compliance_manager"
    }
  }'
```

## 📊 Monitoreo y Logs

### Ver Logs en Tiempo Real
```bash
# Logs de función específica
serverless logs -f ask --stage dev --tail

# Logs de todas las funciones
serverless logs --stage dev --tail
```

### CloudWatch Metrics
```bash
# Ver métricas en AWS Console
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=apptega-compliance-copilot-dev-ask \
  --statistics Sum \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600
```

## 🔧 Configuración Avanzada

### Configuración de Stages

#### Development (.env.dev)
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_DEBUG_MODE=true
ENABLE_MOCK_DATA=true
```

#### Production (.env.prod)
```bash
NODE_ENV=production
LOG_LEVEL=info
ENABLE_DEBUG_MODE=false
ENABLE_MOCK_DATA=false
ENABLE_ERROR_STACK_TRACES=false
```

### Configuración de Recursos AWS

El deployment crea automáticamente:
- **API Gateway** - Endpoints REST
- **Lambda Functions** - Lógica de negocio
- **DynamoDB Table** - Historial de conversaciones
- **IAM Roles** - Permisos necesarios
- **CloudWatch Logs** - Logging centralizado

### Personalización de serverless.yml
```yaml
# Configurar timeout específico
functions:
  ask:
    timeout: 60  # 60 segundos para AI processing

# Configurar variables por stage
custom:
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'us-east-1'}

# Configurar recursos adicionales
resources:
  Resources:
    # Agregar recursos AWS adicionales
```

## 🔒 Seguridad

### API Keys
```bash
# Generar API key segura
openssl rand -base64 32

# Configurar en .env
MASTER_API_KEY=your-generated-key
```

### JWT Secrets
```bash
# Generar JWT secret
openssl rand -base64 64

# Configurar en .env
JWT_SECRET=your-generated-jwt-secret
```

### CORS Configuration
```typescript
// En serverless.ts
cors: {
  origin: ['https://yourdomain.com', 'https://app.apptega.com'],
  headers: ['Content-Type', 'Authorization'],
  credentials: true
}
```

## 🚨 Troubleshooting

### Errores Comunes

#### 1. "Module not found"
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

#### 2. "AWS credentials not found"
```bash
# Verificar configuración
aws configure list
aws sts get-caller-identity
```

#### 3. "Bedrock access denied"
```bash
# Verificar permisos IAM para Bedrock
aws iam list-attached-role-policies --role-name your-lambda-role
```

#### 4. "DynamoDB table already exists"
```bash
# Remover deployment anterior
serverless remove --stage dev
```

### Logs de Debug
```bash
# Habilitar logs detallados
export SLS_DEBUG=*
serverless deploy --stage dev --verbose
```

### Rollback
```bash
# Rollback a versión anterior
serverless rollback --timestamp timestamp-here --stage dev

# Remover deployment completo
serverless remove --stage dev
```

## 📈 Performance Optimization

### Lambda Configuration
```yaml
# En serverless.ts
provider:
  memorySize: 512  # MB
  timeout: 30      # segundos

# Por función específica
functions:
  ask:
    memorySize: 1024  # Más memoria para AI processing
    timeout: 60
```

### Connection Pooling
```bash
# En .env
MYSQL_CONNECTION_LIMIT=10
DYNAMODB_MAX_RETRIES=3
```

### Caching
```bash
# Habilitar caching
ENABLE_CACHING=true
CACHE_TTL=3600
REDIS_URL=redis://your-redis-endpoint:6379
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS
on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: ./scripts/deploy.sh ${{ github.ref_name }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 📞 Soporte

### Información de Deployment
```bash
# Ver información del deployment
cat deployment-info-dev.json

# Verificar endpoints activos
curl -s https://your-api-endpoint.amazonaws.com/dev/health/ping | jq
```

### Contacto
- **Equipo de Desarrollo**: development@yourcompany.com
- **Soporte Técnico**: support@yourcompany.com
- **Documentación**: [Link a documentación completa]

---

## 📝 Checklist de Deployment

- [ ] ✅ Prerrequisitos instalados y verificados
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ AWS credentials configuradas
- [ ] ✅ Tests ejecutados y pasando
- [ ] ✅ Deployment ejecutado exitosamente
- [ ] ✅ Endpoints probados y funcionando
- [ ] ✅ Logs monitoreados y sin errores
- [ ] ✅ Documentación actualizada
- [ ] ✅ Equipo notificado del nuevo deployment

¡Tu Apptega Compliance Copilot está listo para usar! 🎉
