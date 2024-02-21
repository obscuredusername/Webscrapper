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
    const imageUrls = [];
    const videoSources = [];
    const linkUrls = [];

    $('h1, h2, h3, h4, p, span, img, video, a').each((index, element) => {
      const tag = $(element).prop('tagName').toLowerCase();
      const content = $(element).text().trim();

      if (tag === 'img') {
        const imageUrl = $(element).attr('src');
        if (imageUrl) imageUrls.push(imageUrl);
      } else if (tag === 'video') {
        const videoSource = $(element).attr('src');
        if (videoSource) videoSources.push(videoSource);
      } else if (tag === 'a') {
        const linkUrl = $(element).attr('href');
        if (linkUrl) linkUrls.push(linkUrl);
      }

      textContent.push(`<${tag}>${content}</${tag}>`);
    });

    const textFileName = path.join(__dirname, 'text_content.txt');
    await fs.writeFile(textFileName, textContent.join('\n'));

    // Write CSV file with text content
    const csvFileName = path.join(__dirname, 'data.csv');
    await fs.writeFile(csvFileName, textContent.join('\n'));

    return { textContent: textContent.join('\n'), imageUrls, videoSources, linkUrls };
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
      const maxScrolls = 10; // Adjust the number of scrolls as needed
      let scrolled = 0;

      const intervalId = setInterval(() => {
        window.scrollBy(0, window.innerHeight);
        scrolled++;

        if (scrolled >= maxScrolls) {
          clearInterval(intervalId);
          resolve();
        }
      }, 1000); // Adjust the interval as needed
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
