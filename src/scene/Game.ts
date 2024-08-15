import Phaser from 'phaser';
import Grid from '../prefabs/Grid';
import ClueSection from '../prefabs/ClueSection';
import Palette from '../prefabs/Palette';
import Puzzle from '../game/Puzzle';

export default class Game extends Phaser.Scene {
    private isDrawing: boolean = false;
    private drawType: 'fill' | 'mark' | 'clear' = 'clear';
    private borderSize: number = 2;
    private gridBorderThickness: number = 5;
    private gapSize: number = 10;
    private grid?: Grid;
    private rowClues?: ClueSection;
    private colClues?: ClueSection;
    private palette?: Palette;
    private puzzleData?: Puzzle;
    private level: string = "picture1";

    //size of puzzle
    private cellSize: number = 0;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private gridOffsetX: number = 0;
    private gridOffsetY: number = 0;

    constructor() {
        super({ key: 'Game' });
    }

    async create() {
        this.puzzleData = await Puzzle.load(this, this.level);
        this.initializeSize();

        this.grid = new Grid(this, this.cellSize, this.puzzleData.getWidth(), this.puzzleData.getHeight(), this.borderSize, this.gridBorderThickness, this.gridOffsetX, this.gridOffsetY);
        this.rowClues = new ClueSection(this, this.cellSize, this.borderSize, this.gridOffsetX, this.gridOffsetY, this.puzzleData.getRowClues(), true);
        this.colClues = new ClueSection(this, this.cellSize, this.borderSize, this.gridOffsetX, this.gridOffsetY, this.puzzleData.getColClues(), false);
        this.palette = new Palette(this, this.borderSize, this.gapSize, this.puzzleData.extractUniqueColors(), this.cellSize);
    
        const complementaryColor = this.puzzleData.getComplementaryBackgroundColor();
        this.cameras.main.setBackgroundColor(complementaryColor);

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
        const pointerX = Math.floor((pointer.x - this.gridOffsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.gridOffsetY) / this.cellSize);

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

    private initializeSize() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
    
        if (this.puzzleData) {
            const puzzleWidth = this.puzzleData.getWidth();
            const puzzleHeight = this.puzzleData.getHeight();
    
            const cellBuffer = 1;
    
            const maxCellWidth = screenWidth / (puzzleWidth + this.puzzleData.getLongestClueLength(true) + cellBuffer * 3);
            const maxCellHeight = screenHeight / (puzzleHeight + this.puzzleData.getLongestClueLength(false) + cellBuffer * 3);
    
            this.cellSize = Math.min(maxCellWidth, maxCellHeight);
    
            this.gridOffsetX = (screenWidth - this.cellSize * (puzzleWidth + cellBuffer * 2)) / 2 + cellBuffer * this.cellSize;
            this.gridOffsetY = (screenHeight - this.cellSize * (puzzleHeight + cellBuffer * 2)) / 2 + cellBuffer * this.cellSize;
    
            this.offsetX = this.gridOffsetX - (this.puzzleData.getLongestClueLength(true) + cellBuffer) * this.cellSize;
            this.offsetY = this.gridOffsetY - (this.puzzleData.getLongestClueLength(false) + cellBuffer) * this.cellSize;
    
            const clueTopEdge = this.offsetY;
            if (clueTopEdge < cellBuffer * this.cellSize) {
                const verticalAdjustment = cellBuffer * this.cellSize - clueTopEdge;
                this.gridOffsetY += verticalAdjustment;
                this.offsetY += verticalAdjustment;
            }
    
            const clueLeftEdge = this.offsetX;
            if (clueLeftEdge < cellBuffer * this.cellSize) {
                const horizontalAdjustment = cellBuffer * this.cellSize - clueLeftEdge;
                this.gridOffsetX += horizontalAdjustment;
                this.offsetX += horizontalAdjustment;
            }
        }
    }

    private fillCell(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.gridOffsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.gridOffsetY) / this.cellSize);

        if (!this.grid || pointerX < 0 || pointerX >= this.grid.cellColors[0].length || pointerY < 0 || pointerY >= this.grid.cellColors.length) {
            return;
        }

        const selectedColor = this.palette?.getCurrentColor();
        const currentColor = selectedColor !== null && selectedColor !== undefined ? selectedColor : 0xffffff;

        if (this.drawType === 'fill') {
            this.grid.fillCell(pointerX, pointerY, currentColor);
        } else if (this.drawType === 'mark') {
            this.grid.markCell(pointerX, pointerY);
        } else if (this.drawType === 'clear') {
            this.grid.clearCell(pointerX, pointerY);
        }
    }

    private checkCompletion() {
        if (this.isGridComplete()) {
            this.finalizeGrid();
        }
    }

    private isGridComplete(): boolean {
        if (!this.grid || !this.puzzleData) {
            return false;
        }
    
        for (let y = 0; y < this.puzzleData.getHeight(); y++) {
            for (let x = 0; x < this.puzzleData.getWidth(); x++) {
                const pixel = this.puzzleData.getColor(x, y);
    
                if (pixel === null && this.grid.cellColors[y][x] !== null) {
                    return false;
                }
    
                if (pixel !== null) {
                    const gridColor = this.grid.cellColors[y][x];
                    if (gridColor === null || !this.colorsMatch(pixel, gridColor)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    private colorsMatch(color1: Phaser.Display.Color, color2: number): boolean {
        const rgb = Phaser.Display.Color.IntegerToRGB(color2);
        return color1.red === rgb.r && color1.green === rgb.g && color1.blue === rgb.b;
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

    public resize() {
        this.initializeSize();
    
        this.grid?.destroy();
        this.rowClues?.destroy();
        this.colClues?.destroy();
        this.palette?.destroy();
    
        if (!this.puzzleData) {
            return;
        }
        this.grid = new Grid(this, this.cellSize, this.puzzleData.getWidth(), this.puzzleData.getHeight(), this.borderSize, this.gridBorderThickness, this.gridOffsetX, this.gridOffsetY);
        this.rowClues = new ClueSection(this, this.cellSize, this.borderSize, this.gridOffsetX, this.gridOffsetY, this.puzzleData.getRowClues(), true);
        this.colClues = new ClueSection(this, this.cellSize, this.borderSize, this.gridOffsetX, this.gridOffsetY, this.puzzleData.getColClues(), false);
        this.palette = new Palette(this, this.borderSize, this.gapSize, this.puzzleData.extractUniqueColors(), this.cellSize);
    
        this.setupInputEvents();
    }
}