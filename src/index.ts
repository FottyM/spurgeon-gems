import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.time('done...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.spurgeongems.org/spurgeon-audio/');
  await page.screenshot({path: 'example.png'});
  const data = await page.$$eval('tr', (trs) =>
    trs
        .filter((tr) => tr.querySelectorAll('td').length === 2)
        .map((tr) => {
          const content = Array.from(tr.querySelectorAll('td')).reduce(
              (acc, el, i) => {
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
              },
          {} as Record<string, any>,
          );
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
})();
