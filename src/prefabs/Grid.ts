import Phaser from 'phaser';

type CellState = 'empty' | 'filled' | 'marked';

export default class Grid {
    private scene: Phaser.Scene;
    private cellSize: number;
    private borderSize: number;
    private gridBorderThickness: number;
    private offsetX: number;
    private offsetY: number;
    public cellGraphics: Phaser.GameObjects.Graphics[][] = [];
    public cellColors: (number | null)[][] = [];
    public cellStates: CellState[][] = [];
    private gridGraphics?: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, cellSize: number, borderSize: number, gridBorderThickness: number, offsetX: number, offsetY: number) {
        this.scene = scene;
        this.cellSize = cellSize;
        this.borderSize = borderSize;
        this.gridBorderThickness = gridBorderThickness;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }

    initializeGrid(width: number, height: number) {
        this.cellColors = Array.from({ length: height }, () => Array(width).fill(null));
        this.cellStates = Array.from({ length: height }, () => Array(width).fill('empty'));
        for (let y = 0; y < height; y++) {
            const row: Phaser.GameObjects.Graphics[] = [];
            for (let x = 0; x < width; x++) {
                const cellX = this.offsetX + x * this.cellSize;
                const cellY = this.offsetY + y * this.cellSize;
                const graphics = this.scene.add.graphics();
                row.push(graphics);
            }
            this.cellGraphics.push(row);
        }
        this.drawGrid(width, height);
    }

    drawGrid(width: number, height: number) {
        this.gridGraphics = this.scene.add.graphics().lineStyle(this.borderSize, 0x000000);
        for (let x = 0; x <= width; x++) {
            const lineX = this.offsetX + x * this.cellSize;
            this.gridGraphics.moveTo(lineX, this.offsetY).lineTo(lineX, this.offsetY + height * this.cellSize);
        }
        for (let y = 0; y <= height; y++) {
            const lineY = this.offsetY + y * this.cellSize;
            this.gridGraphics.moveTo(this.offsetX, lineY).lineTo(this.offsetX + width * this.cellSize, lineY);
        }
        this.gridGraphics.strokePath();

        this.scene.add.graphics().lineStyle(this.gridBorderThickness, 0x000000).strokeRect(
            this.offsetX - this.borderSize / 2,
            this.offsetY - this.borderSize / 2,
            width * this.cellSize + this.borderSize,
            height * this.cellSize + this.borderSize
        );
    }

    fillCell(x: number, y: number, color: number | null) {
        const cellX = this.offsetX + x * this.cellSize;
        const cellY = this.offsetY + y * this.cellSize;
        const graphics = this.cellGraphics[y][x];
        graphics.clear();

        if (color !== null) {
            graphics.fillStyle(color, 1).fillRect(cellX, cellY, this.cellSize, this.cellSize);
            this.cellColors[y][x] = color;
            this.cellStates[y][x] = 'filled';
        } else {
            this.cellColors[y][x] = null;
            this.cellStates[y][x] = 'empty';
        }
    }

    markCell(x: number, y: number) {
        const cellX = this.offsetX + x * this.cellSize;
        const cellY = this.offsetY + y * this.cellSize;
        const graphics = this.cellGraphics[y][x];
        graphics.clear();

        graphics.lineStyle(2, 0x000000, 1)
            .moveTo(cellX, cellY)
            .lineTo(cellX + this.cellSize, cellY + this.cellSize)
            .moveTo(cellX + this.cellSize, cellY)
            .lineTo(cellX, cellY + this.cellSize)
            .strokePath();

        this.cellColors[y][x] = null;
        this.cellStates[y][x] = 'marked';
    }

    clearCell(x: number, y: number) {
        const cellX = this.offsetX + x * this.cellSize;
        const cellY = this.offsetY + y * this.cellSize;
        const graphics = this.cellGraphics[y][x];
        graphics.clear();

        this.cellColors[y][x] = null;
        this.cellStates[y][x] = 'empty';
    }

    clearGridBorders() {
        if (this.gridGraphics) {
            this.gridGraphics.clear();
        }
    }
}
