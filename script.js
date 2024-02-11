const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 1000;

app.use(express.json());
app.use(cors());

async function scrapeDynamicContent(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the URL and wait for the DOM content to be fully loaded
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Simulate scrolling to load additional content
    await autoScroll(page);

    // Get HTML content after the page has loaded
    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);

    // Extract and save content with proper HTML tags to a text file
    const textContent = [];
    $('h1, h2, h3, h4, p, span').each((index, element) => {
      const tag = $(element).prop('tagName').toLowerCase();
      const content = $(element).text().trim();
      textContent.push(`<${tag}>${content}</${tag}>`);
    });

    const textFileName = path.join(__dirname, 'text_content.txt');
    await fs.writeFile(textFileName, textContent.join('\n'));

    const imageUrls = $('img').map((index, element) => $(element).attr('src')).get();
    const videoSources = $('video source').map((index, element) => $(element).attr('src')).get();
    const linkUrls = $('a').map((index, element) => $(element).attr('href')).get();

    await fs.writeFile(path.join(__dirname, 'imageUrls.txt'), imageUrls.join('\n'));
    await fs.writeFile(path.join(__dirname, 'videoSources.txt'), videoSources.join('\n'));
    await fs.writeFile(path.join(__dirname, 'linkUrls.txt'), linkUrls.join('\n'));

    return { textContent, imageUrls, videoSources, linkUrls };
  } catch (error) {
    console.error('Error during scraping:', error.message);
    return { error: 'Internal Server Error' };
  } finally {
    await browser.close();
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const interval = 100;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });
  });
}

app.post('/scrape', async (req, res) => {
  const inputValue = req.body.url;

  if (!inputValue) {
    return res.status(400).json({ error: 'Please provide a URL.' });
  }

  const result = await scrapeDynamicContent(inputValue);

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
