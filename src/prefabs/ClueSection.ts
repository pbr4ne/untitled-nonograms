import Phaser from 'phaser';
import Clue from '../game/Clue';

export default class ClueSection {
    private scene: Phaser.Scene;
    private cellSize: number;
    private borderSize: number;
    private offsetX: number;
    private offsetY: number;
    public clues: (Clue)[][] = [];
    private isRow: boolean;

    constructor(scene: Phaser.Scene, cellSize: number, borderSize: number, offsetX: number, offsetY: number, clues: (Clue)[][], isRow: boolean) {
        this.scene = scene;
        this.cellSize = cellSize;
        this.borderSize = borderSize;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.clues = clues;
        this.isRow = isRow;

        this.drawClueSet();
    }

    private drawClueSet() {
        this.clues.forEach((clueSet, i) => {
            clueSet.forEach((clue, j) => {   
                let cellX, cellY;
    
                if (this.isRow) {
                    cellX = this.offsetX - (clueSet.length - j) * this.cellSize - this.cellSize;
                    cellY = this.offsetY + i * this.cellSize;
                } else {
                    cellX = this.offsetX + i * this.cellSize;
                    cellY = this.offsetY - (clueSet.length - j) * this.cellSize - this.cellSize;
                }
    
                this.scene.add.graphics().fillStyle(clue.getColor(), 1)
                    .fillRect(cellX, cellY, this.cellSize, this.cellSize)
                    .lineStyle(this.borderSize, 0x000000)
                    .strokeRect(cellX, cellY, this.cellSize, this.cellSize);
    
                const textColor = this.calculateBrightness(clue.getColor()) < 128 ? '#ffffff' : '#000000';
                const fontSize = this.cellSize * 0.50;
                this.scene.add.text(cellX + this.cellSize / 2, cellY + this.cellSize / 2, clue.getNumber().toString(), { 
                    color: textColor,
                    fontSize: `${fontSize}px`,
                    fontFamily: 'Noto Sans Mono',
                })
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
