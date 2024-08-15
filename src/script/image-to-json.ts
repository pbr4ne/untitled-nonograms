const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function convertImageToJson(imagePath: string, outputJsonPath: string) {
    try {
        const image = await loadImage(imagePath);
        const canvas = createCanvas(image.width, image.height);
        const context = canvas.getContext('2d');
        
        context.drawImage(image, 0, 0, image.width, image.height);
        
        const imageData = context.getImageData(0, 0, image.width, image.height);
        const data = imageData.data;
        
        const pixelArray = [];
        for (let y = 0; y < image.height; y++) {
            const row = [];
            for (let x = 0; x < image.width; x++) {
                const index = (y * image.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];
                
                if (a === 0) {
                    row.push(null);
                } else {
                    row.push([r, g, b]);
                }
            }
            pixelArray.push(row);
        }
        
        const jsonOutput = {
            width: image.width,
            height: image.height,
            pixels: pixelArray,
        };
        
        fs.writeFileSync(outputJsonPath, JSON.stringify(jsonOutput));
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