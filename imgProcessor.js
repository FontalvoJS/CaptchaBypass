const Jimp = require("jimp");
const AWS = require("aws-sdk");
const fs = require("fs");
async function removeBorderNoise(imagePath) {
  const image = await Jimp.read(imagePath);
  await image.writeAsync("Antes.png");
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const borderSize = 7; // Define el tamaño del borde que deseas verificar. Ajusta según tus necesidades.

  // Definir una función para determinar si un píxel es oscuro
  function isDarkPixel(red, green, blue) {
    return red < 100 && green < 100 && blue < 100; // Ajusta estos valores según tus necesidades.
  }
  // Convertir la imagen a escala de grises
  image.greyscale();

  // Binarizar
  const threshold = 128;
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
    const gray = Jimp.intToRGBA(image.getPixelColor(x, y)).r;
    const newValue = gray < threshold ? 0x000000ff : 0xffffffff; // Black or White
    image.setPixelColor(newValue, x, y);
  });

  // FILTROS - MODIFICACIONES
  const deleteBorders = async () => {
    // Escanear el borde superior
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < borderSize; y++) {
        const idx = (y * width + x) * 4;
        const red = image.bitmap.data[idx];
        const green = image.bitmap.data[idx + 1];
        const blue = image.bitmap.data[idx + 2];
        if (isDarkPixel(red, green, blue)) {
          image.bitmap.data[idx] = 255;
          image.bitmap.data[idx + 1] = 255;
          image.bitmap.data[idx + 2] = 255;
        }
      }
    }

    // Escanear el borde inferior
    for (let x = 0; x < width; x++) {
      for (let y = height - borderSize; y < height; y++) {
        const idx = (y * width + x) * 4;
        const red = image.bitmap.data[idx];
        const green = image.bitmap.data[idx + 1];
        const blue = image.bitmap.data[idx + 2];
        if (isDarkPixel(red, green, blue)) {
          image.bitmap.data[idx] = 255;
          image.bitmap.data[idx + 1] = 255;
          image.bitmap.data[idx + 2] = 255;
        }
      }
    }

    // Escanear el borde izquierdo
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < borderSize; x++) {
        const idx = (y * width + x) * 4;
        const red = image.bitmap.data[idx];
        const green = image.bitmap.data[idx + 1];
        const blue = image.bitmap.data[idx + 2];
        if (isDarkPixel(red, green, blue)) {
          image.bitmap.data[idx] = 255;
          image.bitmap.data[idx + 1] = 255;
          image.bitmap.data[idx + 2] = 255;
        }
      }
    }

    // Escanear el borde derecho
    for (let y = 0; y < height; y++) {
      for (let x = width - borderSize; x < width; x++) {
        const idx = (y * width + x) * 4;
        const red = image.bitmap.data[idx];
        const green = image.bitmap.data[idx + 1];
        const blue = image.bitmap.data[idx + 2];
        if (isDarkPixel(red, green, blue)) {
          image.bitmap.data[idx] = 255;
          image.bitmap.data[idx + 1] = 255;
          image.bitmap.data[idx + 2] = 255;
        }
      }
    }
  };
  await deleteBorders();

  image.convolute([[1, 1, 1]]).convolute([
    [1, 1],
    [1, 1],
  ]);
  await erode(image, [[1, 1, 1]]);

  await applyMedianFilter(image, [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ]);

  // FILTROS - MODIFICACIONES

  await image.writeAsync("Despues.png");
  awsTextract("Despues.png");
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
async function applyMedianFilter(image, structElement) {
  const offsetX = Math.floor(structElement[0].length / 2);
  const offsetY = Math.floor(structElement.length / 2);

  // filtro mediana
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
    const surroundingPixels = [];

    for (let i = -offsetY; i <= offsetY; i++) {
      for (let j = -offsetX; j <= offsetX; j++) {
        if (
          structElement[i + offsetY][j + offsetX] &&
          image.bitmap.width > x + j &&
          x + j >= 0 &&
          image.bitmap.height > y + i &&
          y + i >= 0
        ) {
          surroundingPixels.push(
            Jimp.intToRGBA(image.getPixelColor(x + j, y + i)).r
          );
        }
      }
    }

    surroundingPixels.sort((a, b) => a - b); // Ordenando

    const medianValue =
      surroundingPixels[Math.floor(surroundingPixels.length / 2)];
    const newValue = Jimp.rgbaToInt(medianValue, medianValue, medianValue, 255);
    image.setPixelColor(newValue, x, y);
  });
}
function erode(image, se) {
  const seCenter = {
    x: Math.floor(se[0].length / 2),
    y: Math.floor(se.length / 2),
  };

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
    let erodePixel = true;

    for (let i = 0; i < se.length; i++) {
      for (let j = 0; j < se[i].length; j++) {
        const xi = x - seCenter.x + i;
        const yj = y - seCenter.y + j;

        if (
          xi >= 0 &&
          xi < image.bitmap.width &&
          yj >= 0 &&
          yj < image.bitmap.height
        ) {
          const pixelColor = Jimp.intToRGBA(image.getPixelColor(xi, yj));
          if (se[i][j] === 1 && pixelColor.r === 255) {
            erodePixel = false;
          }
        }
      }
    }

    if (erodePixel) {
      image.setPixelColor(0x000000ff, x, y);
    }
  });

  return image;
}
async function awsTextract(image) {
  try {
    console.clear();
    console.log("======================================");
    console.log("Analizando imagen...");
    console.log("======================================");
    AWS.config.update({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    uploadToS3(image);

    const textract = new AWS.Textract();
    const bucketName = process.env.AWS_BUCKET_NAME;

    const params = {
      Document: {
        S3Object: {
          Bucket: bucketName,
          Name: image,
        },
      },
    };

    textract.detectDocumentText(params, (err, data) => {
      if (data) {
        console.log("BYPASS: ");
        console.log("-------");
        for (let key in data.Blocks) {
          if (
            data.Blocks[key].Text?.length > 0 
            && data.Blocks[key].BlockType === "LINE"
          ) {
            
            console.log(
              "Codigo: [",
              data.Blocks[key].Text,
              "] | Formato:",
              data.Blocks[key].BlockType
            );
          }
        }
        console.log("======================================");
      }
    });
  } catch (error) {
    console.log("awsTextract: ", error);
  }
}

function uploadToS3(image) {
  try {
    const s3 = new AWS.S3();
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: image,
      Body: fs.readFileSync(image),
    };
    s3.upload(params, (err, data) => {
      if (data) {
        console.log("Imagen almacenada correctamente en S3");
        console.log("======================================");
      }
    });
  } catch (error) {
    console.log("uploadToS3: ", error);
  }
}
async function main() {
  console.log("By: FontalvoJS | https://github.com/FontalvoJS");
  let from = 0;
  let until = 10;
  for (let i = from; i <= until; i++) {
    await removeBorderNoise(
      "http://serviciospub.sic.gov.co/Sic2/Tramites/Radicacion/Radicacion/Librerias/securimage/securimage_show.php?sid=4674619f7bfc3d1c83a5576e838f8968"
    );
  }
  process.exit(0);
}
main();
