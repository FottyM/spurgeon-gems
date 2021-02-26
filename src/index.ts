import {config} from 'dotenv';
import puppeteer from 'puppeteer';
import fs from 'fs';
import got from 'got';
import {URLSearchParams} from 'url';
import cliProgress from 'cli-progress';

config();

type Gem = {
  title?: string | null;
  uri?: string | null;
  verse?: string | null;
};

async function sleep(ms = 30) {
  return new Promise((rs) => setTimeout(rs, ms));
}

(async () => {
  console.time('done...');
  const browser = await puppeteer.launch(
      {defaultViewport: {width: 1920, height: 1080}},
  );
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
          const content = Array.from(
              tr.querySelectorAll('td'))
              .reduce<Gem>((acc, el, i) => {
                if (i === 0) {
                  return Object.assign({}, acc, {
                    title: el?.innerText.trim(),
                    uri: `https://www.spurgeongems.org${el?.querySelector('a')?.getAttribute('href')}`,
                  });
                }
                return Object.assign({}, acc, {
                  verse: el?.innerText.trim(),
                });
              }, {});
          return content;
        }),
  );
  
  const progessBar = new cliProgress
  .SingleBar({}, cliProgress.Presets.shades_classic);
  
  const failed = [] as unknown[]
  
  progessBar.start(data.length, 0);

  for (const [_, sermon] of data.entries()) {
    const searchParams = new URLSearchParams(
        [
          ['passage', sermon?.verse?.replace(/\s/g, '').replace(':', '.')!],
          ['key', process.env.BIBLE_API_KEY!],
        ],
    );

    const res = await got(
        'https://api.biblia.com/v1/bible/content/kjv.json', {searchParams, responseType: 'json'},
    ).catch((er) => {
      failed.push(sermon, er.message, er.status)
    });

    if (res) {
      sermon.verse = sermon.verse! + '\n' +
      (res.body as Record<string, any>).text;
    }

    await sleep(10);
    progessBar.increment()
  }

  progessBar.stop()

  fs.mkdir('json', {recursive: true}, async (err) =>{
    if (err) {
      await browser.close();
      throw err;
    };
    fs.writeFileSync('json/spurgeongems.json', JSON.stringify(data, null, 2));
    fs.writeFileSync('err.txt', JSON.stringify(failed))
  });

  console.timeEnd('done...');
  await browser.close();
})().catch(console.error);
