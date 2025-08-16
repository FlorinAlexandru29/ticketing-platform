import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';

// Prevent FA from adding its CSS again on the client (avoids flash/CLS)
config.autoAddCss = false;