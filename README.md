# Script de Eliminación de Ruido de Bordes para evadir captchas convencionales

Utiliza la librería Jimp para procesar imágenes, eliminando el ruido de borde y realizando análisis de texto utilizando AWS Textract. El objetivo principal es limpiar imágenes escaneadas para mejorar la precisión del análisis de caracteres en captchas.

## Requisitos

- Node.js ultima versión instalado en tu sistema.

## Instalación

1. Clona este repositorio en tu máquina local.

2. Instala las dependencias ejecutando el siguiente comando:

   ```bash
   npm install jimp aws-sdk fs
3. Añade la url donde se generan las imagenes a la funcion await removeBorderNoise(url)
4. Añade tus credenciales de AWS u otro servicio
5. Ejecuta con Node imgProcessor
