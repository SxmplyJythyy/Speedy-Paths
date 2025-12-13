import { CommandPermissionLevel, CustomCommandStatus, world, system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

const AVAILABLE_BLOCKS = [
	'minecraft:grass_path',
	'minecraft:gravel',
	'minecraft:sand',
	'minecraft:red_sand',
	'minecraft:stonebrick',
	'minecraft:stone_brick_slab',
	'minecraft:polished_tuff',
	'minecraft:polished_tuff_slab',
	'minecraft:tuff_bricks',
	'minecraft:tuff_brick_slab',
	'minecraft:concrete',
	'minecraft:terracotta',
];

function matchesEnabledBlock(blockId, enabledBlocks) {
	if (enabledBlocks.includes(blockId)) {
		return true;
	}

	if (blockId.endsWith('_concrete') && enabledBlocks.includes('minecraft:concrete')) {
		return true;
	}

	if (blockId.endsWith('_terracotta') && enabledBlocks.includes('minecraft:terracotta')) {
		return true;
	}

	return false;
}

function getSpeedBlocks() {
	const blocksJson = world.getDynamicProperty('speedBlocks');
	let blocks;

	if (!blocksJson) {
		blocks = ['minecraft:grass_path'];
		world.setDynamicProperty('speedBlocks', JSON.stringify(blocks));
	}
	else {
		blocks = JSON.parse(blocksJson);
	}

	return blocks;
}

function resetToDefaults() {
	world.setDynamicProperty('speedBlocks', JSON.stringify(['minecraft:grass_path']));
	world.setDynamicProperty('enableParticles', false);
	world.setDynamicProperty('speedAmplifier', 1);
}

function showBlockConfigMenu(player) {
	const enabledBlocks = getSpeedBlocks();
	const form = new ActionFormData()
		.title('§fConfigure Speed Blocks')
		.body(`Select blocks to toggle on/off.\n§7Currently enabled: ${enabledBlocks.length} block(s)`);

	for (const block of AVAILABLE_BLOCKS) {
		const isEnabled = enabledBlocks.includes(block);
		const prefix = isEnabled ? '§a[X]' : '§8[ ]';
		const displayName = block.replace('minecraft:', '').replace(/_/g, ' ');
		const coloredName = isEnabled ? `§a${displayName}` : `§8${displayName}`;

		form.button(`${prefix} ${coloredName}`);
	}

	form.button('§l§8« Back to Main Menu');
	form.show(player).then(response => {
		if (response.canceled) {
			showConfigMenu(player);
			return;
		}

		if (response.selection === AVAILABLE_BLOCKS.length) {
			showConfigMenu(player);
			return;
		}

		const selectedBlock = AVAILABLE_BLOCKS[response.selection];
		const currentBlocks = getSpeedBlocks();

		if (currentBlocks.includes(selectedBlock)) {
			const index = currentBlocks.indexOf(selectedBlock);
			currentBlocks.splice(index, 1);
		}
		else {
			currentBlocks.push(selectedBlock);
		}

		world.setDynamicProperty('speedBlocks', JSON.stringify(currentBlocks));
		player.sendMessage(`§aToggled ${selectedBlock}`);
		system.run(() => showBlockConfigMenu(player));
	}).catch(err => {
		player.sendMessage('§cError showing block menu: ' + err);
		console.error('Block menu error:', err);
	});
}

function showGeneralConfigMenu(player) {
	const savedParticles = world.getDynamicProperty('enableParticles') ?? false;
	const savedAmplifier = world.getDynamicProperty('speedAmplifier') ?? 1;

	const particleStatus = savedParticles ? '§aON' : '§cOFF';

	const form = new ActionFormData()
		.title('General Config')
		.body(`§7Current Settings:\n§fParticles: ${particleStatus}\n§fSpeed Level: ${savedAmplifier}`)
		.button(`§l${savedParticles ? '§c' : '§a'}Toggle Particles ${savedParticles ? 'OFF' : 'ON'}`)
		.button(`§lSpeed Level: ${savedAmplifier}`)
		.button('§l§8« Back to Main Menu');

	form.show(player).then(response => {
		if (response.canceled) {
			showConfigMenu(player);
			return;
		}

		if (response.selection === 0) {
			const newParticles = !savedParticles;
			world.setDynamicProperty('enableParticles', newParticles);
			player.sendMessage(`§aParticles ${newParticles ? 'enabled' : 'disabled'}`);
			system.run(() => showGeneralConfigMenu(player));
		}
		else if (response.selection === 1) {
			let newAmplifier = savedAmplifier + 1;
			if (newAmplifier > 3) {
				newAmplifier = 1;
			}
			world.setDynamicProperty('speedAmplifier', newAmplifier);
			player.sendMessage(`§aSpeed level set to ${newAmplifier}`);
			system.run(() => showGeneralConfigMenu(player));
		}
		else if (response.selection === 2) {
			showConfigMenu(player);
		}
	}).catch(err => {
		player.sendMessage('§cError showing general config menu: ' + err);
		console.error('General config menu error:', err);
	});
}

function clearAllSpeedEffects() {
	for (const player of world.getAllPlayers()) {
		try {
			if (player.hasTag('scriptSpeed')) {
				player.removeEffect('minecraft:speed');
				player.removeTag('scriptSpeed');
			}
		}
		catch (error) {
			console.error(`[Speedy Paths] Error clearing effect from player ${player.name}: ${error}`);
		}
	}
}

function updateAllPlayersSpeed() {
	for (const player of world.getAllPlayers()) {
		try {
			const location = player.location;
			const SPEED_BLOCKS = getSpeedBlocks();
			const amplifier = Number(world.getDynamicProperty('speedAmplifier') ?? 1);
			const particles = Boolean(world.getDynamicProperty('enableParticles') ?? false);

			let onSpeedBlock = false;

			for (let yOffset = 0; yOffset <= 3; yOffset++) {
				const checkBlock = player.dimension.getBlock({
					x: Math.floor(location.x),
					y: Math.floor(location.y) - yOffset,
					z: Math.floor(location.z),
				});

				if (checkBlock && matchesEnabledBlock(checkBlock.typeId, SPEED_BLOCKS)) {
					onSpeedBlock = true;
					break;
				}
			}

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
		catch (error) {
			console.error(`[Speedy Paths] Error applying speed effect to player ${player.name}: ${error}`);
		}
	}
}

function showConfigMenu(player) {
	const savedParticles = world.getDynamicProperty('enableParticles') ?? false;
	const savedAmplifier = world.getDynamicProperty('speedAmplifier') ?? 1;
	const enabledBlocks = getSpeedBlocks();

	const particleStatus = savedParticles ? '§aON' : '§cOFF';

	const form = new ActionFormData()
		.title('Speedy Paths Configuration')
		.body(`§7Current Settings:\n§fParticles: ${particleStatus}\n§fSpeed Level: ${savedAmplifier}\n§fEnabled Blocks: ${enabledBlocks.length}`)
		.button('§lGeneral Config')
		.button('§lBlock Config')
		.button('§l§cReset to Defaults')
		.button('§l§aDone');

	form.show(player).then(response => {
		if (response.canceled) {
			player.sendMessage('§aSaved configuration');
			clearAllSpeedEffects();
			updateAllPlayersSpeed();
			return;
		}

		if (response.selection === 0) {
			system.run(() => showGeneralConfigMenu(player));
		}
		else if (response.selection === 1) {
			system.run(() => showBlockConfigMenu(player));
		}
		else if (response.selection === 2) {
			resetToDefaults();
			player.sendMessage('§aReset to default settings');
			clearAllSpeedEffects();
			updateAllPlayersSpeed();
			system.run(() => showConfigMenu(player));
		}
		else if (response.selection === 3) {
			player.sendMessage('§aSaved configuration');
			clearAllSpeedEffects();
			updateAllPlayersSpeed();
		}
	}).catch(err => {
		player.sendMessage('§cError showing form: ' + err);
		console.error('Form error:', err);
	});
}

system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
	customCommandRegistry.registerCommand(
		{
			name: 'speedypaths:config',
			description: 'Open the Speedy Paths configuration menu.',
			permissionLevel: CommandPermissionLevel.Admin,
			cheatsRequired: false,
		},
		(origin) => {
			if (!origin.sourceEntity) {
				return {
					status: CustomCommandStatus.Failure,
					message: 'Command must be executed by a player',
				};
			}

			const player = origin.sourceEntity;

			system.run(() => {
				try {
					showConfigMenu(player);
				}
				catch (error) {
					player.sendMessage('§cError: ' + error);
					console.error('Command error:', error);
				}
			});

			return {
				status: CustomCommandStatus.Success,
				message: 'Opening configuration menu...',
			};
		},
	);
});

world.afterEvents.worldLoad.subscribe(() => {
	world.sendMessage('§a[Speedy Paths] loaded successfully!');
});

system.runInterval(() => {
	updateAllPlayersSpeed();
}, 10);