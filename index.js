/**
 * List callouts — Host half.
 *
 * The Browser half owns all rendering. This half only hands the validated
 * configuration to the page as a global, using the same index-injection hook
 * the shipped document-preview plugin uses for its cache settings.
 */

const FALLBACK_OPACITY = { light: 0.1, dark: 0.15 };

/** Keep only strings, so nothing callable reaches the injected global. */
function asString(value) {
	return typeof value === 'string' ? value : undefined;
}

/** Clamp a configured opacity into [0, 1]. */
function asOpacity(value, fallback) {
	return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

/**
 * Project the plugin row config onto the shape the Browser half reads.
 * @param {unknown} config - the Loader row's config.
 * @returns {{ callouts?: { char: string, color: string, icon?: string }[], opacity: { light: number, dark: number }, defaultViewer: 'callouts' | 'builtin', chatCallouts: boolean }} page configuration.
 */
function projectConfig(config) {
	const source = config !== null && typeof config === 'object' ? config : {};
	const projected = {
		opacity: {
			light: asOpacity(source.opacity?.light, FALLBACK_OPACITY.light),
			dark: asOpacity(source.opacity?.dark, FALLBACK_OPACITY.dark),
		},
		defaultViewer: source.defaultViewer === 'builtin' ? 'builtin' : 'callouts',
		chatCallouts: source.chatCallouts !== false,
	};
	if (Array.isArray(source.callouts)) {
		projected.callouts = source.callouts
			.filter((entry) => entry !== null && typeof entry === 'object')
			.map((entry) => {
				const callout = { char: asString(entry.char) ?? '', color: asString(entry.color) ?? '' };
				const icon = asString(entry.icon);
				if (icon !== undefined) callout.icon = icon;
				return callout;
			});
	}
	return projected;
}

/**
 * Embed the preview configuration in every served page.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context serving browser pages.
 * @param {Record<string, unknown>} config - the row's config.
 * @returns {void}
 */
export function apply(ctx, config) {
	const value = projectConfig(config);
	ctx.on('webserver/index-inject', (table) => {
		table.push({ kind: 'global', name: '__DSH_LIST_CALLOUTS_CONFIG__', value });
	});
}
