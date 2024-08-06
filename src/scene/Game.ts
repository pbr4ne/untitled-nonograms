import Phaser from 'phaser';

export default class Game extends Phaser.Scene {

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#8ecae6');
    }
}
