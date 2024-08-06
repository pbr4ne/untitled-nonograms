import Phaser from "phaser";
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';
import Preload from "./scene/Preload";
import Game from "./scene/Game";

const game = new Phaser.Game({
    width: 1920,
    height: 1080,
    backgroundColor: "#023047",
    scale: {
        mode: Phaser.Scale.ScaleModes.FIT,
        autoCenter: Phaser.Scale.Center.CENTER_BOTH
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

game.scene.start("Preload");