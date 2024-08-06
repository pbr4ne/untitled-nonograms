import Phaser from 'phaser';

export default class Game extends Phaser.Scene {

    private isDrawing: boolean = false;
    private currentColor: number = 0xffffff;
    private cellSize: number = 30;
    private borderSize: number = 1;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private cellGraphics: Phaser.GameObjects.Graphics[][] = [];
    private rowClues: { color: number, count: number }[][] = [];
    private colClues: { color: number, count: number }[][] = [];

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#8ecae6');
        this.analyzeAndDrawImage('picture1');
        this.input.mouse?.disableContextMenu();
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDrawing = true;
            this.fillCell(pointer);
        });
        this.input.on('pointerup', () => {
            this.isDrawing = false;
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDrawing) {
                this.fillCell(pointer);
            }
        });
    }

    analyzeAndDrawImage(key: string) {
        const texture = this.textures.get(key);

        if (!texture || !texture.source[0] || !(texture.source[0].image instanceof HTMLImageElement)) {
            console.error('Invalid texture source');
            return;
        }

        const imageElement = texture.source[0].image as HTMLImageElement;

        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        const context = canvas.getContext('2d');

        if (context) {
            context.drawImage(imageElement, 0, 0);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const gridWidth = (canvas.width + 5) * (this.cellSize + this.borderSize); // Adjusted for extra cell
            const gridHeight = (canvas.height + 5) * (this.cellSize + this.borderSize); // Adjusted for extra cell

            this.offsetX = (this.sys.game.config.width as number - gridWidth) / 2;
            this.offsetY = (this.sys.game.config.height as number - gridHeight) / 2;

            this.calculateClues(canvas.width, canvas.height, data);

            //row clues
            for (let y = 0; y < this.rowClues.length; y++) {
                const clues = this.rowClues[y];
                for (let i = 0; i < clues.length; i++) {
                    const clue = clues[i];
                    const cellY = this.offsetY + (y + 5) * (this.cellSize + this.borderSize);
                    const cellX = this.offsetX - (clues.length - i) * (this.cellSize + this.borderSize);

                    const clueGraphics = this.add.graphics();
                    clueGraphics.fillStyle(clue.color, 1);
                    clueGraphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                    clueGraphics.lineStyle(this.borderSize, 0x000000);
                    clueGraphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);

                    this.add.text(cellX + this.cellSize / 2, cellY + this.cellSize / 2, clue.count.toString(), { color: '#000000' })
                        .setOrigin(0.5);
                }
            }

            //column clues
            for (let x = 0; x < this.colClues.length; x++) {
                const clues = this.colClues[x];
                for (let i = 0; i < clues.length; i++) {
                    const clue = clues[i];
                    const cellX = this.offsetX + (x + 5) * (this.cellSize + this.borderSize);
                    const cellY = this.offsetY - (clues.length - i) * (this.cellSize + this.borderSize);

                    const clueGraphics = this.add.graphics();
                    clueGraphics.fillStyle(clue.color, 1);
                    clueGraphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                    clueGraphics.lineStyle(this.borderSize, 0x000000);
                    clueGraphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);

                    this.add.text(cellX + this.cellSize / 2, cellY + this.cellSize / 2, clue.count.toString(), { color: '#000000' })
                        .setOrigin(0.5);
                }
            }

            for (let y = 0; y < canvas.height; y++) {
                const row: Phaser.GameObjects.Graphics[] = [];
                for (let x = 0; x < canvas.width; x++) {
                    const index = (x + y * canvas.width) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    const a = data[index + 3] / 255;

                    const cellX = this.offsetX + (x + 5) * (this.cellSize + this.borderSize);
                    const cellY = this.offsetY + (y + 5) * (this.cellSize + this.borderSize);

                    const graphics = this.add.graphics();
                    graphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), a);
                    graphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                    graphics.lineStyle(this.borderSize, 0x000000);
                    graphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);

                    row.push(graphics);

                    const rect = this.add.rectangle(cellX + this.cellSize / 2, cellY + this.cellSize / 2, this.cellSize, this.cellSize, 0xffffff, 0)
                        .setInteractive({ useHandCursor: true });

                    rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                        if (pointer.rightButtonDown()) {
                            graphics.clear();
                            graphics.lineStyle(this.borderSize, 0x000000);
                            graphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
                        } else {
                            this.currentColor = Phaser.Display.Color.GetColor(255, 255, 255);
                            graphics.fillStyle(this.currentColor, 1);
                            graphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                            graphics.lineStyle(this.borderSize, 0x000000);
                            graphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
                        }
                    });
                }
                this.cellGraphics.push(row);
            }
        } else {
            console.error('Unable to get 2D context from canvas');
        }
    }

    calculateClues(width: number, height: number, data: Uint8ClampedArray) {
        this.rowClues = [];
        this.colClues = [];

        for (let y = 0; y < height; y++) {
            const row: { color: number, count: number }[] = [];
            let count = 0;
            let currentColor = 0;
            for (let x = 0; x < width; x++) {
                const index = (x + y * width) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3] / 255;
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (a > 0 && (count === 0 || color === currentColor)) {
                    count++;
                    currentColor = color;
                } else {
                    if (count > 0) {
                        row.push({ color: currentColor, count });
                    }
                    currentColor = color;
                    count = a > 0 ? 1 : 0;
                }
            }
            if (count > 0) row.push({ color: currentColor, count });
            this.rowClues.push(row);
        }

        for (let x = 0; x < width; x++) {
            const col: { color: number, count: number }[] = [];
            let count = 0;
            let currentColor = 0;
            for (let y = 0; y < height; y++) {
                const index = (x + y * width) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3] / 255;
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (a > 0 && (count === 0 || color === currentColor)) {
                    count++;
                    currentColor = color;
                } else {
                    if (count > 0) {
                        col.push({ color: currentColor, count });
                    }
                    currentColor = color;
                    count = a > 0 ? 1 : 0;
                }
            }
            if (count > 0) col.push({ color: currentColor, count });
            this.colClues.push(col);
        }
    }

    fillCell(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.offsetX) / (this.cellSize + this.borderSize)) - 5;
        const pointerY = Math.floor((pointer.y - this.offsetY) / (this.cellSize + this.borderSize)) - 5;

        if (pointerX < 0 || pointerX >= this.cellGraphics[0].length || pointerY < 0 || pointerY >= this.cellGraphics.length) {
            return;
        }

        const cellX = this.offsetX + (pointerX + 5) * (this.cellSize + this.borderSize);
        const cellY = this.offsetY + (pointerY + 5) * (this.cellSize + this.borderSize);

        const graphics = this.cellGraphics[pointerY][pointerX];

        if (pointer.rightButtonDown()) {
            graphics.clear();
            graphics.lineStyle(this.borderSize, 0x000000);
            graphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
        } else {
            graphics.fillStyle(this.currentColor, 1);
            graphics.fillRect(cellX, cellY, this.cellSize, this.cellSize);
            graphics.lineStyle(this.borderSize, 0x000000);
            graphics.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
        }
    }
}
