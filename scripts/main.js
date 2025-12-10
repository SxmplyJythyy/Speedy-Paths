// import * as Minecraft from '@minecraft/server';
import { world, system } from '@minecraft/server';
// import { ModalFormData } from '@minecraft/server-ui';
// const BLOCK_OPTIONS = [
// 	'minecraft:grass_path',
// 	'minecraft:dirt',
// 	'minecraft:stone',
// 	'minecraft:soul_sand',
// ];

// this is to be completed later
// system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {

// 	customCommandRegistry.registerCommand(
// 		{
// 			name: 'speedypaths:config',
// 			description: 'Open the Speedy Paths configuration menu.',
// 			permissionLevel: Minecraft.CommandPermissionLevel.Admin,
// 			parameters: [],
// 		},
// 		(origin) => {
// 			const player = origin.player;

// 			if (!player) return;

// 			system.run(() => {
// 				const blocksJson = world.getDynamicProperty('speedBlocks') ?? '[]';
// 				const savedBlocks = JSON.parse(blocksJson);
// 				const savedAmplifier = world.getDynamicProperty('speedAmplifier') ?? 1;
// 				const savedParticles = world.getDynamicProperty('enableParticles') ?? false;

// 				const form = new ModalFormData()
// 					.title('Speedy Paths Configuration');

// 				for (const block of BLOCK_OPTIONS) {
// 					const defaultEnabled = savedBlocks.length === 0 && block === 'minecraft:grass_path' ? true : savedBlocks.includes(block);

// 					form.toggle(`Enable ${block}`, defaultEnabled);
// 				}

// 				form.slider('Speed Amplifier (1-5)', 1, 3, 1, savedAmplifier);
// 				form.toggle('Enable Speed Particles', savedParticles);

// 				form.show(player).then(response => {
// 					if (!response.canceled) {
// 						const chosenBlocks = [];

// 						for (let i = 0; i < BLOCK_OPTIONS.length; i++) {
// 							if (response.formValues[i]) {
// 								chosenBlocks.push(BLOCK_OPTIONS[i]);
// 							}
// 						}

// 						const speedAmplifier = response.formValues[BLOCK_OPTIONS.length];
// 						const enableParticles = response.formValues[BLOCK_OPTIONS.length + 1];

// 						world.setDynamicProperty('speedBlocks', JSON.stringify(chosenBlocks));
// 						world.setDynamicProperty('speedAmplifier', speedAmplifier);
// 						world.setDynamicProperty('enableParticles', enableParticles);
// 					}
// 				});
// 			});
// 		},
// 	);
// });

system.runInterval(() => {
	for (const player of world.getAllPlayers()) {
		try {
			const location = player.location;
			const blockAtFeet = player.dimension.getBlock({
				x: Math.floor(location.x),
				y: Math.floor(location.y),
				z: Math.floor(location.z),
			});
			const blockBelow = player.dimension.getBlock({
				x: Math.floor(location.x),
				y: Math.floor(location.y) - 1,
				z: Math.floor(location.z),
			});

			const blocksJson = world.getDynamicProperty('speedBlocks') ?? '["minecraft:grass_path"]';
			const SPEED_BLOCKS = JSON.parse(blocksJson);
			const amplifier = world.getDynamicProperty('speedAmplifier') ?? 1;
			const particles = world.getDynamicProperty('enableParticles') ?? false;

			const onSpeedBlock =
        (blockAtFeet && SPEED_BLOCKS.includes(blockAtFeet.typeId)) ||
        (blockBelow && SPEED_BLOCKS.includes(blockBelow.typeId));

			const currentEffect = player.getEffect('speed');
			const hasTag = player.hasTag('scriptSpeed');

			if (onSpeedBlock) {
				if (!currentEffect || !hasTag || currentEffect.duration < 40) {
					player.addEffect('minecraft:speed', 12000, {
						amplifier,
						showParticles: particles,
					});

					if (!hasTag) {
						player.addTag('scriptSpeed');
					}
				}
			}
			else if (hasTag) {
				player.removeEffect('minecraft:speed');
				player.removeTag('scriptSpeed');
			}
		}
		catch (error) {}
	}
}, 5);