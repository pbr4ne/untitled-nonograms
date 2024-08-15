import Clue from "./Clue";

export default class Puzzle {
    private pixels: (number[] | null)[][] = [];
    private width: number = 0;
    private height: number = 0;
    private rowClues: (Clue)[][] = [];
    private colClues: (Clue)[][] = [];

    private constructor() {}

    public static async load(scene: Phaser.Scene, textureKey: string): Promise<Puzzle> {
        return new Promise<Puzzle>((resolve, reject) => {
            scene.load.json(textureKey, `/assets/puzzles/${textureKey}.json`);
            scene.load.once('complete', () => {
                const data = scene.cache.json.get(textureKey);
                if (data) {
                    const puzzle = new Puzzle();
                    puzzle.onJsonLoaded(data);
                    resolve(puzzle);
                } else {
                    reject(new Error(`JSON data with key "${textureKey}" is not found in the cache.`));
                }
            });
            scene.load.start();
        });
    }

    private onJsonLoaded(data: any) {
        this.width = data.width;
        this.height = data.height;
        this.pixels = data.pixels;

        this.rowClues = this.generateClueSet(true);
        this.colClues = this.generateClueSet(false);
    }

    public getColor(x: number, y: number): Phaser.Display.Color | null {
        if (y >= 0 && y < this.pixels.length && x >= 0 && x < this.pixels[y].length) {
            const pixel = this.pixels[y][x];
            return pixel ? new Phaser.Display.Color(pixel[0], pixel[1], pixel[2]) : null;
        }
        return null;
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

    public getLongestClueLength(isRow: boolean): number {
        const clues = isRow ? this.rowClues : this.colClues;
        return Math.max(...clues.map((line) => line.length));
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
        for (const row of this.pixels) {
            for (const pixel of row) {
                if (pixel !== null) {
                    uniqueColors.add(Phaser.Display.Color.GetColor(pixel[0], pixel[1], pixel[2]));
                }
            }
        }
        return Array.from(uniqueColors);
    }

    private getMostCommonColor(): number {
        const colorCount = new Map<number, number>();

        for (const row of this.pixels) {
            for (const pixel of row) {
                if (pixel !== null) {
                    const color = Phaser.Display.Color.GetColor(pixel[0], pixel[1], pixel[2]);
                    colorCount.set(color, (colorCount.get(color) || 0) + 1);
                }
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
                const pixel = isRow ? this.pixels[i][j] : this.pixels[j][i];
                const color = pixel ? Phaser.Display.Color.GetColor(pixel[0], pixel[1], pixel[2]) : null;

                if (color !== null && (count === 0 || color === currentColor)) {
                    count++;
                    currentColor = color;
                } else {
                    if (count > 0 && currentColor !== null) {
                        line.push(new Clue(currentColor, count));
                    }
                    currentColor = color;
                    count = color !== null ? 1 : 0;
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
