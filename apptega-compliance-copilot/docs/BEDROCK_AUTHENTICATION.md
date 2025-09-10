# AWS Bedrock Authentication Guide

## 🔐 Autenticación para AWS Bedrock

AWS Bedrock requiere credenciales válidas de AWS para funcionar. Este documento explica las diferentes opciones de autenticación disponibles.

## 📋 Requisitos Previos

1. **Cuenta AWS activa** con acceso a Bedrock
2. **Modelos habilitados** en tu región (Claude 3.5 Sonnet y Claude 3 Haiku)
3. **Permisos IAM** apropiados para invocar modelos de Bedrock

## 🔑 Opciones de Autenticación

### 1. Credenciales Directas (Desarrollo/Testing)

**Uso recomendado**: Desarrollo local, testing, CI/CD

```bash
# En tu archivo .env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=abc123...
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
```

**Ventajas**:
- Simple de configurar
- Control directo sobre las credenciales
- Funciona en cualquier entorno

**Desventajas**:
- Credenciales estáticas
- Riesgo de seguridad si se exponen
- Requiere rotación manual

### 2. AWS CLI Profile

**Uso recomendado**: Desarrollo local con múltiples cuentas

```bash
# Configurar perfil
aws configure --profile apptega-copilot
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: abc123...
# Default region: us-east-1
# Default output format: json

# En tu archivo .env
AWS_PROFILE=apptega-copilot
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
```

**Ventajas**:
- Manejo centralizado de credenciales
- Soporte para múltiples perfiles
- Integración con AWS CLI

**Desventajas**:
- Requiere AWS CLI instalado
- Credenciales almacenadas en el sistema

### 3. IAM Role (Producción Recomendado)

**Uso recomendado**: Deployment en AWS (Lambda, EC2, ECS)

Cuando el código se ejecuta en AWS, las credenciales se obtienen automáticamente del rol IAM asignado:

```typescript
// El código no necesita credenciales explícitas
// AWS SDK las obtiene automáticamente del rol
this.client = new BedrockRuntimeClient({
  region: config.region
  // No credentials needed - automatic from IAM role
});
```

**Ventajas**:
- Seguridad máxima
- Credenciales temporales automáticas
- Sin manejo manual de claves
- Rotación automática

**Desventajas**:
- Solo funciona en AWS
- Requiere configuración de roles

## 🛡️ Permisos IAM Requeridos

### Política Mínima para Bedrock

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
                "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
            ]
        }
    ]
}
```

### Política Completa (Incluye Health Checks)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",
                "bedrock:GetFoundationModel",
                "bedrock:ListFoundationModels"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🔧 Configuración del Servicio

El `BedrockService` maneja automáticamente las diferentes opciones de autenticación:

```typescript
// Constructor del servicio
private constructor() {
  const config: BedrockConfig = {
    region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN || process.env.AWS_BEARER_TOKEN_BEDROCK
  };

  // Validación de credenciales
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error('AWS credentials are required for Bedrock service');
  }

  // Configuración del cliente
  this.client = new BedrockRuntimeClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken && { sessionToken: config.sessionToken })
    }
  });
}
```

## 🌍 Configuración por Entorno

### Desarrollo Local

```bash
# .env.development
AWS_ACCESS_KEY_ID=your_dev_access_key
AWS_SECRET_ACCESS_KEY=your_dev_secret_key
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0  # Modelo más barato para dev
```

### Staging

```bash
# .env.staging
AWS_PROFILE=apptega-staging
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### Producción

```bash
# .env.production (en Lambda)
# Las credenciales se obtienen automáticamente del rol IAM
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

## 🏗️ Deployment en AWS

El archivo `serverless.ts` ya incluye los permisos IAM necesarios:

```typescript
iam: {
  role: {
    statements: [
      {
        Effect: 'Allow',
        Action: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream'
        ],
        Resource: [
          'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0',
          'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'
        ]
      }
    ]
  }
}
```

## 🚨 Solución de Problemas

### Error: "AWS credentials are required for Bedrock service"

**Causa**: No se encontraron credenciales AWS válidas.

**Soluciones**:
1. Verificar variables de entorno `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`
2. Configurar perfil AWS con `aws configure`
3. Verificar que el rol IAM tenga permisos (en AWS)

### Error: "UnauthorizedOperation" o "AccessDenied"

**Causa**: Las credenciales no tienen permisos suficientes.

**Soluciones**:
1. Verificar que el usuario/rol tenga permisos `bedrock:InvokeModel`
2. Verificar que el modelo esté disponible en tu región
3. Verificar que el modelo esté habilitado en tu cuenta

### Error: "ModelNotFound" o "ValidationException"

**Causa**: El modelo especificado no está disponible.

**Soluciones**:
1. Verificar que el modelo esté habilitado en AWS Bedrock Console
2. Verificar que estás usando la región correcta
3. Verificar el ID del modelo en `BEDROCK_MODEL_ID`

### Error: "ThrottlingException"

**Causa**: Demasiadas solicitudes simultáneas.

**Soluciones**:
1. El servicio implementa retry automático con backoff exponencial
2. Revisar límites de cuota en AWS Console
3. Considerar usar el modelo Haiku para cargas altas

## 📊 Monitoreo y Logs

El servicio incluye logging detallado para debugging:

```typescript
logger.info('Bedrock service initialized', {
  region: config.region,
  defaultModel: this.defaultModel,
  fallbackModel: this.fallbackModel,
  maxRetries: this.retryConfig.maxRetries
});
```

Para debugging de autenticación, revisar los logs de CloudWatch o consola local.

## 🔗 Enlaces Útiles

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [AWS IAM Policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [Anthropic Claude Models](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html)

