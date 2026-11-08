/**
 * List Callouts — Host half.
 *
 * Declares the configuration this plugin owns. The DSH settings service serves it
 * as the `obsidian-list-callouts` namespace: the page in the Plugins section
 * edits the volatile fields through the shared configuration form, and the
 * writes persist in the profile's configuration layer like any other plugin's.
 *
 * The Host also hands the initial values to the page as a global, so the Browser
 * half renders correctly on first paint, before the settings mirror answers.
 */

import z from '@deepseek-ai/schemastery';

/** Marker defaults, mirrored by the Browser half when no configuration arrives. */
const DEFAULT_CALLOUTS = [
	{ char: '&', color: '255, 214, 0' },
	{ char: '?', color: '255, 145, 0' },
	{ char: '!', color: '255, 23, 68' },
	{ char: '~', color: '124, 77, 255' },
	{ char: '@', color: '0, 184, 212' },
	{ char: '$', color: '0, 200, 83' },
	{ char: '%', color: '158, 158, 158' },
];

/** The configuration form the settings service builds for this entry. */
export const Config = z.object({
	callouts: z
		.array(
			z.object({
				char: z.string().description('Marker character at the start of a list item.'),
				color: z.string().description('Marker and tint color, as "r, g, b".'),
				icon: z.string().default('').description('Optional glyph drawn instead of the character.'),
			}),
		)
		.default(DEFAULT_CALLOUTS)
		.description('List callout definitions, in display order.')
		.volatile(),
	opacityLight: z.number().min(0).max(1).default(0.1).description('Tint alpha in light mode.').volatile(),
	opacityDark: z.number().min(0).max(1).default(0.15).description('Tint alpha in dark mode.').volatile(),
	chatCallouts: z.boolean().default(true).description('Decorate Chat messages as well.').volatile(),
	markdownCallouts: z
		.boolean()
		.default(true)
		.description('Render .md previews through this bundle’s Markdown renderer; off hands them to the shipped renderer.')
		.volatile(),
	defaultViewer: z
		.union([z.const('callouts'), z.const('builtin')])
		.default('callouts')
		.description('Which .md renderer opens first; "builtin" keeps the shipped renderer in front.'),
});

/**
 * Project the live configuration onto the shape the Browser half reads.
 * @param {object} config - the resolved row configuration.
 * @returns {{ callouts: { char: string, color: string, icon?: string }[], opacity: { light: number, dark: number }, chatCallouts: boolean, markdownCallouts: boolean, defaultViewer: 'callouts' | 'builtin' }} page configuration.
 */
function projectConfig(config) {
	const callouts = config.callouts.get();
	const light = config.opacityLight.get();
	const dark = config.opacityDark.get();
	return {
		callouts: Array.isArray(callouts)
			? callouts.map((entry) => {
					const callout = { char: String(entry?.char ?? ''), color: String(entry?.color ?? '') };
					const icon = typeof entry?.icon === 'string' ? entry.icon.trim() : '';
					if (icon !== '') callout.icon = icon;
					return callout;
				})
			: [],
		opacity: {
			light: typeof light === 'number' ? light : 0.1,
			dark: typeof dark === 'number' ? dark : 0.15,
		},
		chatCallouts: config.chatCallouts.get() !== false,
		markdownCallouts: config.markdownCallouts.get() !== false,
		defaultViewer: config.defaultViewer === 'builtin' ? 'builtin' : 'callouts',
	};
}

/**
 * Publish the configuration page policy and the initial browser configuration.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {object} config - the resolved row configuration.
 * @returns {void}
 */
export function apply(ctx, config) {
	// This plugin ships its own page, so the settings service must not offer a
	// generated one; scoped to this fiber so a reloaded settings service re-adopts it.
	ctx.inject(['settings'], (child) => {
		child.effect(() => child.settings.configure({ auto: false }, ctx.fiber), 'list-callouts: configuration page policy');
	});
	ctx.on('webserver/index-inject', (table) => {
		table.push({ kind: 'global', name: '__DSH_LIST_CALLOUTS_CONFIG__', value: projectConfig(config) });
	});
}
