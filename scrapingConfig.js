// scrapingConfig.js

module.exports = {
    chapterSelectors: [
        {
            type: 'h2',
            conditions: [
                { name: 'class', value: 'nobreak' },
                { name: 'id', startsWith: 'CHAPTER_' },
            ],
        },
        {
            type: 'h2',
            conditions: [
                { name: 'class', value: 'nobreak' },
                { name: 'text', includes: 'chapter' },
            ],
        },
        {
            type: 'div',
            conditions: [
                { name: 'class', value: 'chapter-summary' },
            ],
            action: (element) => {
                element.find('p').text('');
            },
        },
    ],
    endSelectors: [
        {
            type: 'p',
            conditions: [
                { name: 'class', value: 'finis' },
            ],
            action: () => false, // Stop processing chapters
        },
    ],
};
