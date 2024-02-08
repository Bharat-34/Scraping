const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const url = 'https://www.gutenberg.org/cache/epub/72883/pg72883-images.html';
const ttsApiEndpoint = 'https://would-childhood-author-pst.trycloudflare.com/tts_stream';

async function generateAudioForChapter(chapter, chapterNumber, isFirstChapter) {
    try {
        // Create a folder for the current chapter if it doesn't exist
        const outputFolder = path.join(__dirname, 'audio', `Chapter_${chapterNumber}`);
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
        }

        // Combine title and author with the content of the first chapter
        const combinedContent = isFirstChapter ? `${chapter[0]} By ${authorName} ${chapter.slice(1).join(' ')}` : chapter.join(' ');

        // Process the combined content and generate audio file
        const response = await axios.get(ttsApiEndpoint, {
            params: {
                text: combinedContent,
                speaker_wav: 'female.wav',
                language: 'en',
            },
            responseType: 'stream',
        });

        // Define the file path inside the chapter folder
        const filePath = path.join(outputFolder, `Part${chapterNumber}.wav`);

        // Create a write stream and save the audio file
        const writeStream = fs.createWriteStream(filePath);

        response.data.pipe(writeStream);

        await new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                console.log(`Audio file generated: ${filePath}`);
                resolve();
            });
            writeStream.on('error', reject);
        });
    } catch (error) {
        console.error('Error generating audio for chapter:', error.message);
    }
}


async function scrapeGutenberg() {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Selecting title and author information
        const bookTitle = $('p:contains("Title"):first').text().replace('Title:', '').trim();
        const authorName = $('#pg-header-authlist p:contains("Author")').text().replace('Author:', '').trim();

        const bookTitleSelector = 'p:contains("Title"):first';
        const authorNameSelector = '#pg-header-authlist p:contains("Author")';

        const bookTitleElement = $(bookTitleSelector);
        const authorNameElement = $(authorNameSelector);

        if (bookTitleElement.length > 0) {
            const bookTitle = bookTitleElement.text().replace('Title:', '').trim();
            console.log(`Title:: ${bookTitle}`);
        }

        if (authorNameElement.length > 0) {
            const authorName = authorNameElement.text().replace('Author:', '').trim();
            console.log(`By : ${authorName}`);
        }

        // Selecting chapter titles and content
        const allChapters = [];
        let currentChapter = null;
        let isFirstChapter = true;

       // Process each element
       $('body *').each((index, element) => {
        const elementType = element.name;
    
        if (elementType === 'h2' && $(element).find('a[id^="CHAPTER_"]').length > 0) {
            // Found a chapter heading
            const chapterTitle = $(element).text().trim();
    
            if (isSummary(chapterTitle)) {
                // Skip chapter summaries
                return;
            }
    
            if (currentChapter !== null) {
                // Add the current chapter to the array
                allChapters.push(currentChapter);
            }
    
            // Create a new chapter object
            currentChapter = {
                title: chapterTitle,
                content: [],
            };
    
            if (isFirstChapter) {
                // Add title and author to the first chapter
                currentChapter.content.push(`${bookTitle} By ${authorName}`);
                isFirstChapter = false; // Update isFirstChapter after processing the first chapter
            }
        } else if (elementType === 'div' && $(element).hasClass('chapter-summary')) {
            // Replace chapter summary content with 6 dots
            $(element).find('p').text('');
        } else if ((elementType === 'h2' && $(element).attr('class') === 'nobreak' && $(element).attr('id').startsWith('CHAPTER_')) ||
                   (elementType === 'h2' && $(element).text().toLowerCase().includes('chapter'))) {
            // Existing and new selectors for chapter title
            const chapterTitle = $(element).text().trim();
    
            if (isSummary(chapterTitle)) {
                // Skip chapter summaries
                return;
            }
    
            if (currentChapter !== null) {
                // Add the current chapter to the array
                allChapters.push(currentChapter);
            }
    
            // Create a new chapter object
            currentChapter = {
                title: chapterTitle,
                content: [],
            };
    
            if (isFirstChapter) {
                // Add title and author to the first chapter
                currentChapter.content.push(`${bookTitle} By ${authorName}`);
                isFirstChapter = false; // Update isFirstChapter after processing the first chapter
            }
        } else if (elementType === 'p' && $(element).hasClass('finis')) {
            // Found "The End" paragraph, stop processing chapters
            return false;
        } else if (currentChapter !== null && elementType === 'p') {
            // Process paragraphs within chapters
            const paragraphText = $(element).text().trim();
            const cleanedParagraph = paragraphText.replace(/\[Pg\s?\d+\]/g, ''); // Remove [Pg value]
            if (cleanedParagraph.trim() !== '') {
                currentChapter.content.push(cleanedParagraph);
            }
        }
    });
    

        // Add the last chapter to the array
        if (currentChapter !== null) {
            allChapters.push(currentChapter);
        }


        // Add the last chapter to the array
        if (currentChapter !== null) {
            allChapters.push(currentChapter);

        }

        //Output and generate audio for the first chapter
        // const firstChapter = allChapters[0];
        // console.log(firstChapter.content.join('\n')); // Output the formatted paragraphs
        // console.log('......');

        // // Generate audio for the first chapter
        // await generateAudioForChapter((firstChapter.content), 1, isFirstChapter);
        // isFirstChapter = false; // Update isFirstChapter after processing the first chapter


        // Output and generate audio for all chapters
        for (let i = 0; i < allChapters.length; i++) {
            const chapter = allChapters[i];
            console.log(`${chapter.title}`);
            console.log(chapter.content.join('\n')); // Output the formatted paragraphs
            console.log('......');

            // Generate audio for each chapter
            await generateAudioForChapter(chapter.content, i + 1, isFirstChapter);
            isFirstChapter = false; // Update isFirstChapter after processing the first chapter
        }


        console.log('Script executed successfully.');
    } catch (error) {
        console.error('Error fetching and parsing data:', error.message);
    }
}


// Function to check if the chapter title indicates a summary
function isSummary(title) {
    const summaryKeywords = ['summary', 'synopsis', 'digest'];
    return summaryKeywords.some(keyword => title.toLowerCase().includes(keyword));
}

// Call the async function immediately yes
scrapeGutenberg();


