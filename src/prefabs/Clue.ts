import Phaser from 'phaser';

export default class Clue {
    private scene: Phaser.Scene;
    private cellSize: number;
    private borderSize: number;
    private offsetX: number;
    private offsetY: number;
    public rowClues: { color: number, count: number }[][] = [];
    public colClues: { color: number, count: number }[][] = [];

    constructor(scene: Phaser.Scene, cellSize: number, borderSize: number, offsetX: number, offsetY: number) {
        this.scene = scene;
        this.cellSize = cellSize;
        this.borderSize = borderSize;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }

    generateClues(width: number, height: number, data: Uint8ClampedArray) {
        this.rowClues = this.generateClueSet(width, height, data, true);
        this.colClues = this.generateClueSet(width, height, data, false);
    }

    private generateClueSet(width: number, height: number, data: Uint8ClampedArray, isRow: boolean) {
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

    drawClues() {
        this.drawClueSet(this.rowClues, true);
        this.drawClueSet(this.colClues, false);
    }

    private drawClueSet(clues: { color: number, count: number }[][], isRow: boolean) {
        clues.forEach((clueSet, i) => {
            clueSet.forEach((clue, j) => {
                const [cellX, cellY] = isRow ?
                    [this.offsetX - (clueSet.length - j + 1) * this.cellSize, this.offsetY + i * this.cellSize] :
                    [this.offsetX + i * this.cellSize, this.offsetY - (clueSet.length - j + 1) * this.cellSize];

                const clueGraphics = this.scene.add.graphics().fillStyle(clue.color, 1)
                    .fillRect(cellX, cellY, this.cellSize, this.cellSize)
                    .lineStyle(this.borderSize, 0x000000)
                    .strokeRect(cellX, cellY, this.cellSize, this.cellSize);

                const textColor = this.calculateBrightness(clue.color) < 128 ? '#ffffff' : '#000000';
                this.scene.add.text(cellX + this.cellSize / 2, cellY + this.cellSize / 2, clue.count.toString(), { color: textColor })
                    .setOrigin(0.5);
            });
        });
    }

    private calculateBrightness(color: number): number {
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
    }
}
