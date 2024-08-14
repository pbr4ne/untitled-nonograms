import Clue from "./Clue";

export default class Puzzle {
    private pixels: (Phaser.Display.Color | null)[][];
    private data: Uint8ClampedArray;
    private width: number;
    private height: number;
    private rowClues: (Clue)[][] = [];
    private colClues: (Clue)[][] = [];

    constructor(texture: Phaser.Textures.Texture) {
        this.pixels = [];

        if (!texture?.source[0]?.image) {
            throw new Error('Invalid texture source');
        }

        const imageElement = texture.source[0].image as HTMLImageElement;
        const [canvas, context] = this.createCanvasAndContext(imageElement);

        if (!context) {
            throw new Error('Unable to get 2D context from canvas');
        }

        context.drawImage(imageElement, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        this.data = imageData.data;
        this.width = canvas.width;
        this.height = canvas.height;
    
        this.populatePixels(this.data, this.width, this.height);

        this.rowClues = this.generateClueSet(true);
        this.colClues = this.generateClueSet(false);
    }

    public getColor(x: number, y: number): Phaser.Display.Color | null {
        if (y >= 0 && y < this.pixels.length && x >= 0 && x < this.pixels[y].length) {
            return this.pixels[y][x];
        }
        return null;
    }

    public getData(): Uint8ClampedArray {
        return this.data;
    }

    public getWidth(): number {
        return this.pixels[0]?.length || 0;
    }

    public getHeight(): number {
        return this.pixels.length;
    }

    public getRowClues(): (Clue)[][] {
        return this.rowClues;
    }

    public getColClues(): (Clue)[][] {
        return this.colClues;
    }

    public getComplementaryBackgroundColor(): number {
        let color = this.getMostCommonColor();
        const { r, g, b } = Phaser.Display.Color.IntegerToRGB(color);
        const complementaryColor = Phaser.Display.Color.GetColor(255 - r, 255 - g, 255 - b);

        const hsvColor = Phaser.Display.Color.RGBToHSV(
            Phaser.Display.Color.IntegerToRGB(complementaryColor).r,
            Phaser.Display.Color.IntegerToRGB(complementaryColor).g,
            Phaser.Display.Color.IntegerToRGB(complementaryColor).b
        );

        let backgroundColor = Phaser.Display.Color.HSVToRGB(hsvColor.h, hsvColor.s * 0.2, Math.min(hsvColor.v + 0.2, 1));
        return backgroundColor.color;
    }

    public extractUniqueColors(): number[] {
        const uniqueColors = new Set<number>();
        for (let i = 0; i < this.data.length; i += 4) {
            const [r, g, b, a] = this.data.slice(i, i + 4);
            if (a === 255) {
                uniqueColors.add(Phaser.Display.Color.GetColor(r, g, b));
            }
        }
        return Array.from(uniqueColors);
    }

    private populatePixels(data: Uint8ClampedArray, width: number, height: number): void {
        for (let y = 0; y < height; y++) {
            const row: (Phaser.Display.Color | null)[] = [];
            for (let x = 0; x < width; x++) {
                const index = (x + y * width) * 4;
                const [r, g, b, a] = this.data.slice(index, index + 4);
                //only consider pixels with full alpha
                if (a === 255) {
                    row.push(new Phaser.Display.Color(r, g, b));
                } else {
                    row.push(null);
                }
            }
            this.pixels.push(row);
        }
    }

    private createCanvasAndContext(imageElement: HTMLImageElement): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        const context = canvas.getContext('2d');
        return [canvas, context];
    }

    private getMostCommonColor(): number {
        const colorCount = new Map<number, number>();

        for (let i = 0; i < this.data.length; i += 4) {
            const [r, g, b, a] = this.data.slice(i, i + 4);
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

    private generateClueSet(isRow: boolean) {
        const clues: (Clue)[][] = [];
        for (let i = 0; i < (isRow ? this.height : this.width); i++) {
            const line: (Clue)[] = [];
            let count = 0;
            let currentColor: number | null = null;

            for (let j = 0; j < (isRow ? this.width : this.height); j++) {
                const index = ((isRow ? j + i * this.width : i + j * this.width) * 4);
                const [r, g, b, a] = this.data.slice(index, index + 4);
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (a > 0 && (count === 0 || color === currentColor)) {
                    count++;
                    currentColor = color;
                } else {
                    if (count > 0 && currentColor !== null) {
                        line.push(new Clue(currentColor, count));
                    }
                    currentColor = (a > 0) ? color : null;
                    count = a > 0 ? 1 : 0;
                }
            }
            if (count > 0 && currentColor !== null) {
                line.push(new Clue(currentColor, count));
            }
            clues.push(line);
        }
        return clues;
    }
    
}
