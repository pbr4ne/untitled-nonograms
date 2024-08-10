import Phaser from 'phaser';
import Grid from '../prefabs/Grid';
import Clue from '../prefabs/Clue';
import Palette from '../prefabs/Palette';
import ImageAnalyzer from '../prefabs/ImageAnalyzer';

export default class Game extends Phaser.Scene {
    private isDrawing: boolean = false;
    private drawType: 'fill' | 'mark' | 'clear' = 'clear';
    private cellSize: number = 30;
    private borderSize: number = 2;
    private gridBorderThickness: number = 5;
    private gapSize: number = 10;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private grid?: Grid;
    private clues?: Clue;
    private palette?: Palette;
    private imageAnalyzer?: ImageAnalyzer;
    private level: string = "picture2";

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#8ecae6');
        this.imageAnalyzer = new ImageAnalyzer(this);
        this.palette = new Palette(this, this.borderSize, this.gapSize);
        this.analyzeAndDrawImage(this.level);
        this.input.mouse?.disableContextMenu();
        this.setupInputEvents();
    }

    private setupInputEvents() {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDrawing = true;
            this.determineDrawType(pointer);
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

    private determineDrawType(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.offsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.offsetY) / this.cellSize);

        if (!this.grid || pointerX < 0 || pointerX >= this.grid.cellColors[0].length || pointerY < 0 || pointerY >= this.grid.cellColors.length) {
            return;
        }

        const currentState = this.grid.cellStates[pointerY][pointerX];
        const selectedColor = this.palette?.getCurrentColor();

        if (pointer.rightButtonDown()) {
            if (currentState === 'empty' || currentState === 'filled') {
                this.drawType = 'mark';
            } else if (currentState === 'marked') {
                this.drawType = 'clear';
            }
        } else {
            if (currentState === 'empty' || currentState === 'marked') {
                if (selectedColor !== null) {
                    this.drawType = 'fill';
                }
            } else if (currentState === 'filled') {
                const currentColor = this.grid.cellColors[pointerY][pointerX];
                if (selectedColor !== null && currentColor !== selectedColor) {
                    this.drawType = 'fill';
                } else {
                    this.drawType = 'clear';
                }
            }
        }
    }

    private analyzeAndDrawImage(key: string) {
        const analysis = this.imageAnalyzer?.analyzeImage(key);
        if (analysis) {
            const { data, width, height } = analysis;
            this.initializeGrid(data, width, height);
        }
    }

    private initializeGrid(data: Uint8ClampedArray, width: number, height: number) {
        const screenWidth = this.sys.game.config.width as number;
        const screenHeight = this.sys.game.config.height as number;
        const maxGridWidth = screenWidth - this.gapSize * 2 - this.gridBorderThickness * 2;
        const maxGridHeight = screenHeight - this.gapSize * 2 - this.gridBorderThickness * 2;
        const cellSizeX = maxGridWidth / (width + 10);
        const cellSizeY = maxGridHeight / (height + 10);
        this.cellSize = Math.min(cellSizeX, cellSizeY);

        const gridWidth = width * this.cellSize;
        const gridHeight = height * this.cellSize;

        this.clues = new Clue(this, this.cellSize, this.borderSize);
        this.clues.generateClues(width, height, data);

        const maxRowClues = this.clues.getMaxRowClueLength();
        const maxColClues = this.clues.getMaxColClueLength();

        const totalWidth = gridWidth + maxRowClues * this.cellSize + this.gapSize;
        const totalHeight = gridHeight + maxColClues * this.cellSize + this.gapSize;

        this.offsetX = Math.max((screenWidth - totalWidth) / 2 + maxRowClues * this.cellSize + this.gapSize, 0);
        this.offsetY = Math.max((screenHeight - totalHeight) / 2 + maxColClues * this.cellSize + this.gapSize, 0);

        this.clues.setOffsets(this.offsetX, this.offsetY);

        const uniqueColors = this.imageAnalyzer?.extractUniqueColors(data) || [];
        this.palette?.drawColorPalette(uniqueColors, this.cellSize);

        this.grid = new Grid(this, this.cellSize, this.borderSize, this.gridBorderThickness, this.offsetX, this.offsetY);
        this.grid.initializeGrid(width, height);

        this.clues.drawClues();
    }

    private fillCell(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.offsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.offsetY) / this.cellSize);

        if (!this.grid || pointerX < 0 || pointerX >= this.grid.cellColors[0].length || pointerY < 0 || pointerY >= this.grid.cellColors.length) {
            return;
        }

        const currentColor = this.palette?.getCurrentColor() || 0xffffff;

        if (this.drawType === 'fill') {
            this.grid.fillCell(pointerX, pointerY, currentColor);
        } else if (this.drawType === 'mark') {
            this.grid.markCell(pointerX, pointerY);
        } else if (this.drawType === 'clear') {
            this.grid.clearCell(pointerX, pointerY);
        }
    }

    private checkCompletion() {
        const texture = this.textures.get(this.level);
        const imageElement = texture.source[0].image as HTMLImageElement;

        const imageData = this.imageAnalyzer?.getImageData(imageElement);

        if (imageData) {
            if (this.isGridComplete(imageData.data, imageData.width, imageData.height)) {
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

                if (a === 0 && this.grid.cellColors[y][x] !== null) {
                    return false;
                }

                if (a > 0 && (this.grid.cellColors[y][x] === null || this.grid.cellColors[y][x] !== color)) {
                    return false;
                }
            }
        }
        return true;
    }

    private finalizeGrid() {
        if (!this.grid) {
            return;
        }

        //clear the x
        for (let y = 0; y < this.grid.cellColors.length; y++) {
            for (let x = 0; x < this.grid.cellColors[y].length; x++) {
                if (this.grid.cellStates[y][x] === 'marked') {
                    this.grid.clearCell(x, y);
                }
            }
        }

        this.grid.clearGridBorders();

        this.input.off('pointerdown');
        this.input.off('pointerup');
        this.input.off('pointermove');
    }
}