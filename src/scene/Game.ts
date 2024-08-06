import Phaser from 'phaser';

export default class Game extends Phaser.Scene {

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#8ecae6');
        this.analyzeAndDrawImage('picture1');

    }

    analyzeAndDrawImage(key: string) {
        const texture = this.textures.get(key);

        if (!texture || !texture.source[0] || !(texture.source[0].image instanceof HTMLImageElement)) {
            console.error('Invalid texture source');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = texture.source[0].width;
        canvas.height = texture.source[0].height;
        const context = canvas.getContext('2d');

        if (context) {
            context.drawImage(texture.source[0].image, 0, 0);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const cellSize = 30;
            const borderSize = 1;

            const gridWidth = canvas.width * (cellSize + borderSize);
            const gridHeight = canvas.height * (cellSize + borderSize);

            const offsetX = (this.sys.game.config.width as number - gridWidth) / 2;
            const offsetY = (this.sys.game.config.height as number - gridHeight) / 2;

            const graphics = this.add.graphics();

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const index = (x + y * canvas.width) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    const a = data[index + 3] / 255;

                    graphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), a);

                    const cellX = offsetX + x * (cellSize + borderSize);
                    const cellY = offsetY + y * (cellSize + borderSize);

                    graphics.fillRect(cellX, cellY, cellSize, cellSize);
                    graphics.lineStyle(borderSize, 0x000000);
                    graphics.strokeRect(cellX, cellY, cellSize, cellSize);

                    const rect = this.add.rectangle(cellX + cellSize / 2, cellY + cellSize / 2, cellSize, cellSize, 0xffffff, 0)
                        .setInteractive({ useHandCursor: true });

                    rect.on('pointerdown', () => {
                        graphics.fillStyle(Phaser.Display.Color.GetColor(255, 255, 255), 1);
                        graphics.fillRect(cellX, cellY, cellSize, cellSize);
                        graphics.lineStyle(borderSize, 0x000000);
                        graphics.strokeRect(cellX, cellY, cellSize, cellSize);
                    });
                }
            }
        } else {
            console.error('Unable to get 2D context from canvas');
        }
    }
}
