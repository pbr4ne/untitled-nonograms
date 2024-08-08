import Phaser from 'phaser';

export default class Palette {
    private scene: Phaser.Scene;
    private borderSize: number;
    private colors: number[] = [];
    private colorGraphics: Phaser.GameObjects.Graphics[] = [];
    private highlightGraphics?: Phaser.GameObjects.Graphics;
    private currentColorIndex: number = -1;
    private gapSize: number;

    constructor(scene: Phaser.Scene, borderSize: number, gapSize: number) {
        this.scene = scene;
        this.borderSize = borderSize;
        this.gapSize = gapSize;
    }

    drawColorPalette(colors: number[], cellSize: number) {
        this.colors = colors;
        const startX = this.gapSize + 10;
        const startY = (this.scene.sys.game.config.height as number) - cellSize - this.gapSize;

        colors.forEach((color, index) => {
            const x = startX + (index * (cellSize + this.gapSize));
            const paletteGraphics = this.scene.add.graphics()
                .fillStyle(color, 1)
                .fillRect(x, startY, cellSize, cellSize)
                .lineStyle(this.borderSize, 0x000000)
                .strokeRect(x, startY, cellSize, cellSize);

            paletteGraphics.setInteractive(new Phaser.Geom.Rectangle(x, startY, cellSize, cellSize), Phaser.Geom.Rectangle.Contains);

            paletteGraphics.on('pointerdown', () => {
                this.currentColorIndex = index;
                this.updateHighlight(x, startY, cellSize);
            });

            this.colorGraphics.push(paletteGraphics);
        });
    }

    getCurrentColor(): number {
        if (this.currentColorIndex >= 0 && this.currentColorIndex < this.colors.length) {
            return this.colors[this.currentColorIndex];
        }
        return 0xffffff;
    }

    private updateHighlight(x: number, y: number, size: number) {
        if (this.highlightGraphics) {
            this.highlightGraphics.destroy();
        }

        this.highlightGraphics = this.scene.add.graphics()
            .lineStyle(this.borderSize, 0xffff00, 1)
            .strokeRect(x - this.borderSize / 2, y - this.borderSize / 2, size + this.borderSize, size + this.borderSize);
    }
}
