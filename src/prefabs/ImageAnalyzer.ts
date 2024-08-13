import Phaser from 'phaser';

export default class ImageAnalyzer {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    analyzeImage(key: string): { data: Uint8ClampedArray, width: number, height: number } | null {
        const texture = this.scene.textures.get(key);
        if (!texture?.source[0]?.image) {
            console.error('Invalid texture source');
            return null;
        }

        const imageElement = texture.source[0].image as HTMLImageElement;
        const [canvas, context] = this.createCanvasAndContext(imageElement);

        if (context) {
            context.drawImage(imageElement, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            return { data: imageData.data, width: canvas.width, height: canvas.height };
        } else {
            console.error('Unable to get 2D context from canvas');
            return null;
        }
    }

    extractUniqueColors(data: Uint8ClampedArray): number[] {
        const uniqueColors = new Set<number>();
        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, a] = data.slice(i, i + 4);
            if (a > 0) {
                uniqueColors.add(Phaser.Display.Color.GetColor(r, g, b));
            }
        }
        return Array.from(uniqueColors);
    }

    getMostCommonColor(data: Uint8ClampedArray): number {
        const colorCount = new Map<number, number>();

        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, a] = data.slice(i, i + 4);
            if (a > 0) {
                const color = Phaser.Display.Color.GetColor(r, g, b);
                colorCount.set(color, (colorCount.get(color) || 0) + 1);
            }
        }

        let mostCommonColor = 0;
        let maxCount = 0;

        for (const [color, count] of colorCount) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonColor = color;
            }
        }

        return mostCommonColor;
    }

    getComplementaryColor(color: number): number {
        const { r, g, b } = Phaser.Display.Color.IntegerToRGB(color);
        const complementaryColor = Phaser.Display.Color.GetColor(255 - r, 255 - g, 255 - b);
        return complementaryColor;
    }

    getImageData(imageElement: HTMLImageElement): ImageData | null {
        const [canvas, context] = this.createCanvasAndContext(imageElement);
        if (context) {
            context.drawImage(imageElement, 0, 0);
            return context.getImageData(0, 0, canvas.width, canvas.height);
        }
        return null;
    }

    private createCanvasAndContext(imageElement: HTMLImageElement): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        const context = canvas.getContext('2d');
        return [canvas, context];
    }
}
