import StyleDictionary from 'style-dictionary';
import config from './config.js';

const sd = new StyleDictionary(config);
await sd.buildAllPlatforms();
