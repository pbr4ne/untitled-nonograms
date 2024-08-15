const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function convertImageToJson(imagePath: any, outputJsonPath: any) {
    try {
        const image = await loadImage(imagePath);
        const canvas = createCanvas(image.width, image.height);
        const context = canvas.getContext('2d');
        
        context.drawImage(image, 0, 0, image.width, image.height);
        
        const imageData = context.getImageData(0, 0, image.width, image.height);
        const data = imageData.data;
        
        const pixelArray = [];
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            pixelArray.push([r, g, b, a]);
        }
        
        const jsonOutput = {
            width: image.width,
            height: image.height,
            pixels: pixelArray,
        };
        
        fs.writeFileSync(outputJsonPath, JSON.stringify(jsonOutput, null, 2));
        console.log(`Image data written to ${outputJsonPath}`);
    } catch (error) {
        console.error('Error converting image to JSON:', error);
    }
}

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node image-to-json.js <input-image> <output-json>');
    process.exit(1);
}

const inputImagePath = path.resolve(args[0]);
const outputJsonPath = path.resolve(args[1]);

convertImageToJson(inputImagePath, outputJsonPath);
