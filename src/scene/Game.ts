import Phaser from 'phaser';
import Grid from '../prefabs/Grid';

export default class Game extends Phaser.Scene {
    private isDrawing: boolean = false;
    private currentColor: number = 0xffffff;
    private cellSize: number = 30;
    private borderSize: number = 2;
    private gridBorderThickness: number = 5;
    private gapSize: number = 0;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private grid?: Grid;
    private rowClues: { color: number, count: number }[][] = [];
    private colClues: { color: number, count: number }[][] = [];
    private colorPalette: Phaser.GameObjects.Graphics[] = [];

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#8ecae6');
        this.analyzeAndDrawImage('picture1');
        this.input.mouse?.disableContextMenu();
        this.setupInputEvents();
    }

    private setupInputEvents() {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDrawing = true;
            this.fillCell(pointer);
        });
        this.input.on('pointerup', () => {
            this.isDrawing = false;
            this.checkCompletion();
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDrawing) {
                this.fillCell(pointer);
            }
        });
    }

    private analyzeAndDrawImage(key: string) {
        const texture = this.textures.get(key);
        if (!texture?.source[0]?.image) {
            console.error('Invalid texture source');
            return;
        }

        const imageElement = texture.source[0].image as HTMLImageElement;
        const [canvas, context] = this.createCanvasAndContext(imageElement);

        if (context) {
            context.drawImage(imageElement, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            this.initializeGrid(imageData, canvas.width, canvas.height);
        } else {
            console.error('Unable to get 2D context from canvas');
        }
    }

    private createCanvasAndContext(imageElement: HTMLImageElement): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        const context = canvas.getContext('2d');
        return [canvas, context];
    }

    private initializeGrid(imageData: ImageData, width: number, height: number) {
        const screenWidth = this.sys.game.config.width as number;
        const screenHeight = this.sys.game.config.height as number;
        const maxGridWidth = screenWidth - this.gapSize * 2 - this.gridBorderThickness * 2;
        const maxGridHeight = screenHeight - this.gapSize * 2 - this.gridBorderThickness * 2;
        const cellSizeX = maxGridWidth / (width + 10);
        const cellSizeY = maxGridHeight / (height + 10);
        this.cellSize = Math.min(cellSizeX, cellSizeY);

        const gridWidth = width * this.cellSize;
        const gridHeight = height * this.cellSize;

        this.calculateClues(width, height, imageData.data);

        const maxRowClues = Math.max(...this.rowClues.map(clues => clues.length));
        const maxColClues = Math.max(...this.colClues.map(clues => clues.length));

        const totalWidth = gridWidth + maxRowClues * this.cellSize + this.gapSize;
        const totalHeight = gridHeight + maxColClues * this.cellSize + this.gapSize;

        this.offsetX = (screenWidth - totalWidth) / 2 + maxRowClues * this.cellSize + this.gapSize;
        this.offsetY = (screenHeight - totalHeight) / 2 + maxColClues * this.cellSize + this.gapSize;

        const uniqueColors = this.extractUniqueColors(imageData.data);
        this.drawColorPalette(uniqueColors);

        this.grid = new Grid(this, this.cellSize, this.borderSize, this.gridBorderThickness, this.offsetX, this.offsetY);
        this.grid.initializeGrid(width, height);
        this.drawClues();
    }

    private extractUniqueColors(data: Uint8ClampedArray): number[] {
        const uniqueColors = new Set<number>();
        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, a] = data.slice(i, i + 4);
            if (a > 0) {
                uniqueColors.add(Phaser.Display.Color.GetColor(r, g, b));
            }
        }
        this.currentColor = Array.from(uniqueColors)[0];
        return Array.from(uniqueColors);
    }

    private drawColorPalette(colors: number[]) {
        const paletteSize = 40;
        const paletteMargin = 10;
        const startX = this.gapSize + 10;
        const startY = (this.sys.game.config.height as number) - paletteSize - paletteMargin;
    
        colors.forEach((color, index) => {
            const x = startX + (index * (paletteSize + paletteMargin));
            const paletteGraphics = this.add.graphics()
                .fillStyle(color, 1)
                .fillRect(x, startY, paletteSize, paletteSize)
                .lineStyle(this.borderSize, 0x000000)
                .strokeRect(x, startY, paletteSize, paletteSize);
    
            paletteGraphics.setInteractive(new Phaser.Geom.Rectangle(x, startY, paletteSize, paletteSize), Phaser.Geom.Rectangle.Contains);
    
            if (paletteGraphics.input) {
                paletteGraphics.input.cursor = 'pointer';
            }
    
            paletteGraphics.on('pointerdown', () => {
                this.currentColor = color;
            });
    
            this.colorPalette.push(paletteGraphics);
        });
    }

    private calculateClues(width: number, height: number, data: Uint8ClampedArray) {
        this.rowClues = this.generateClues(width, height, data, true);
        this.colClues = this.generateClues(width, height, data, false);
    }

    private generateClues(width: number, height: number, data: Uint8ClampedArray, isRow: boolean) {
        const clues: { color: number, count: number }[][] = [];
        for (let i = 0; i < (isRow ? height : width); i++) {
            const line: { color: number, count: number }[] = [];
            let count = 0;
            let currentColor = 0;
            for (let j = 0; j < (isRow ? width : height); j++) {
                const index = ((isRow ? j + i * width : i + j * width) * 4);
                const [r, g, b, a] = data.slice(index, index + 4);
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (a > 0 && (count === 0 || color === currentColor)) {
                    count++;
                    currentColor = color;
                } else {
                    if (count > 0) line.push({ color: currentColor, count });
                    currentColor = color;
                    count = a > 0 ? 1 : 0;
                }
            }
            if (count > 0) line.push({ color: currentColor, count });
            clues.push(line);
        }
        return clues;
    }

    private calculateBrightness(color: number): number {
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
    }

    private drawClues() {
        this.drawClueSet(this.rowClues, true);
        this.drawClueSet(this.colClues, false);
    }

    private drawClueSet(clues: { color: number, count: number }[][], isRow: boolean) {
        clues.forEach((clueSet, i) => {
            clueSet.forEach((clue, j) => {
                const [cellX, cellY] = isRow ?
                    [this.offsetX - (clueSet.length - j + 1) * this.cellSize - this.gapSize, this.offsetY + i * this.cellSize] :
                    [this.offsetX + i * this.cellSize, this.offsetY - (clueSet.length - j + 1) * this.cellSize - this.gapSize];

                const clueGraphics = this.add.graphics().fillStyle(clue.color, 1)
                    .fillRect(cellX, cellY, this.cellSize, this.cellSize)
                    .lineStyle(this.borderSize, 0x000000)
                    .strokeRect(cellX, cellY, this.cellSize, this.cellSize);

                const textColor = this.calculateBrightness(clue.color) < 128 ? '#ffffff' : '#000000';
                this.add.text(cellX + this.cellSize / 2, cellY + this.cellSize / 2, clue.count.toString(), { color: textColor })
                    .setOrigin(0.5);
            });
        });
    }

    private fillCell(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.offsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.offsetY) / this.cellSize);

        if (!this.grid || pointerX < 0 || pointerX >= this.grid.cellColors[0].length || pointerY < 0 || pointerY >= this.grid.cellColors.length) {
            return;
        }

        if (pointer.rightButtonDown()) {
            this.grid.fillCell(pointerX, pointerY, 0xffffff);
        } else {
            this.grid.fillCell(pointerX, pointerY, this.currentColor);
        }
    }

    private checkCompletion() {
        const texture = this.textures.get('picture1');
        const imageElement = texture.source[0].image as HTMLImageElement;

        const [canvas, context] = this.createCanvasAndContext(imageElement);

        if (context) {
            context.drawImage(imageElement, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

            if (this.isGridComplete(imageData.data, canvas.width, canvas.height)) {
                this.finalizeGrid();
            }
        }
    }

    private isGridComplete(data: Uint8ClampedArray, width: number, height: number): boolean {
        if (!this.grid) {
            return false;
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (x + y * width) * 4;
                const [r, g, b, a] = data.slice(index, index + 4);
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (color === 0) {
                    continue;
                }
                if ((a > 0 && this.grid.cellColors[y][x] === 0xffffff) || (a <= 0 && this.grid.cellColors[y][x] !== color) || (a === 0 && this.grid.cellColors[y][x] !== 0xffffff)) {
                    console.log(x, y, color, this.grid.cellColors[y][x]);
                    console.log("false");
                    return false;
                }
            }
        }
        return true;
    }

    private finalizeGrid() {
        this.grid?.clearGrid();

        if (!this.grid) {
            return;
        }

        for (let y = 0; y < this.grid.cellColors.length; y++) {
            for (let x = 0; x < this.grid.cellColors[y].length; x++) {
                const graphics = this.grid.cellGraphics[y][x];
                graphics.clear();
                const color = this.grid.cellColors[y][x];
                if (color !== 0xffffff) {
                    graphics.fillStyle(color, 1).fillRect(this.offsetX + x * this.cellSize, this.offsetY + y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

        this.input.off('pointerdown');
        this.input.off('pointerup');
        this.input.off('pointermove');
    }
}
