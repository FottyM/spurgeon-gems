import puppeteer from 'puppeteer';
import fs from 'fs';
type Gem = {
  title?: string | null;
  uri?: string | null;
  verse?: string | null;
  verseURI?: string | null;
}

(async () => {
  console.time('done...');
  const browser = await puppeteer.launch({
    defaultViewport: {width: 1920, height: 1080},
  });
  const page = await browser.newPage();

  await page.goto('https://www.spurgeongems.org/spurgeon-audio/');
  await page.screenshot({
    path: 'screenshots/spurgeongems.jpg',
    quality: 100,
    fullPage: true,
  });

  const data = await page.$$eval('tr', (trs) =>
    trs
        .filter((tr) => tr.querySelectorAll('td').length === 2)
        .map((tr) => {
          const content = Array
              .from(tr.querySelectorAll('td'))
              .reduce<Gem>((acc, el, i) => {
                if (i === 0) {
                  return Object.assign({}, acc, {
                    title: el?.innerText.trim(),
                    uri: `https://www.spurgeongems.org${el
                        ?.querySelector('a')
                        ?.getAttribute('href')}`,
                  });
                }
                return Object.assign({}, acc, {
                  verse: el?.innerText.trim(),
                  verseURI: el?.querySelector('a')?.getAttribute('href'),
                });
              }, {});
          return content;
        }),
  );

  fs.mkdir('json', {recursive: true}, async (err) =>{
    if (err) {
      await browser.close();
      throw err;
    };
    fs.writeFileSync('json/spurgeongems.json', JSON.stringify(data, null, 2));
  });

  console.timeEnd('done...');
  await browser.close();
})().catch(console.error);
