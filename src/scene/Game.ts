import Phaser from 'phaser';
import Grid from '../prefabs/Grid';
import Clue from '../prefabs/Clue';

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
    private clues?: Clue;
    private colorPalette: Phaser.GameObjects.Graphics[] = [];

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#8ecae6');
        this.analyzeAndDrawImage('picture2');
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

        this.offsetX = (screenWidth - gridWidth) / 2;
        this.offsetY = (screenHeight - gridHeight) / 2;

        const uniqueColors = this.extractUniqueColors(imageData.data);
        this.drawColorPalette(uniqueColors);

        this.grid = new Grid(this, this.cellSize, this.borderSize, this.gridBorderThickness, this.offsetX, this.offsetY);
        this.grid.initializeGrid(width, height);

        this.clues = new Clue(this, this.cellSize, this.borderSize, this.offsetX, this.offsetY);
        this.clues.generateClues(width, height, imageData.data);
        this.clues.drawClues();
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
