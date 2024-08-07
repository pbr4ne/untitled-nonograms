import Phaser from 'phaser';

export default class Palette {
    private scene: Phaser.Scene;
    private borderSize: number;
    private currentColor: number;
    private colorPalette: Phaser.GameObjects.Graphics[] = [];

    constructor(scene: Phaser.Scene, borderSize: number) {
        this.scene = scene;
        this.borderSize = borderSize;
        this.currentColor = 0xffffff;
    }

    drawColorPalette(colors: number[], gapSize: number) {
        const paletteSize = 40;
        const paletteMargin = 10;
        const startX = gapSize + 10;
        const startY = (this.scene.sys.game.config.height as number) - paletteSize - paletteMargin;

        colors.forEach((color, index) => {
            const x = startX + (index * (paletteSize + paletteMargin));
            const paletteGraphics = this.scene.add.graphics()
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

        this.currentColor = colors[0];
    }

    getCurrentColor(): number {
        return this.currentColor;
    }
}
