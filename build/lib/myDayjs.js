import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear.js';
// locales of all languages supported by ioBroker (dayjs does not load locales automatically like moment did)
import 'dayjs/locale/de.js';
import 'dayjs/locale/es.js';
import 'dayjs/locale/fr.js';
import 'dayjs/locale/it.js';
import 'dayjs/locale/nl.js';
import 'dayjs/locale/pl.js';
import 'dayjs/locale/pt.js';
import 'dayjs/locale/ru.js';
import 'dayjs/locale/uk.js';
import 'dayjs/locale/zh-cn.js';
dayjs.extend(dayOfYear);
// dayjs abbreviates weekdays differently than moment did for these locales -> keep the previous output
dayjs.Ls.pt.weekdaysShort = 'Dom_Seg_Ter_Qua_Qui_Sex_Sáb'.split('_');
dayjs.Ls.ru.weekdaysShort = 'вс_пн_вт_ср_чт_пт_сб'.split('_');
dayjs.Ls.uk.weekdaysShort = 'нд_пн_вт_ср_чт_пт_сб'.split('_');
export default dayjs;
