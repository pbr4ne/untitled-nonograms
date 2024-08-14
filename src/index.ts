import Phaser from "phaser";
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';
import Preload from "./scene/Preload";
import Game from "./scene/Game";

const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#023047",
    scale: {
        mode: Phaser.Scale.ScaleModes.RESIZE,
        autoCenter: Phaser.Scale.Center.CENTER_BOTH,
    },
    scene: [Preload, Game],
    transparent: true,
    input: {
        activePointers: 3,
    },
    plugins: {
        scene: [{
            key: 'rexUI',
            plugin: RexUIPlugin,
            mapping: 'rexUI'
        }]
    }
});

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
    game.canvas.style.width = `${window.innerWidth}px`;
    game.canvas.style.height = `${window.innerHeight}px`;
    (game.scene.getScene('Game') as Game).resize();
});

game.scene.start("Preload");
