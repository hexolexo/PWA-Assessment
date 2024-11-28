document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createForm');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    // Valid categories
    const validCategories = ['rules', 'combat', 'conditions', 'homebrew'];

    function collectTags() {
        return Array.from(
            document.querySelectorAll('input[name="tags"]:checked')
        ).map(checkbox => checkbox.value);
    }

    function validateInputs(data) {
        // Add more specific validation
        if (data.title.length > 100) {
            throw new Error('Title is too long (max 100 characters)');
        }

        if (data.contents.length > 1000) {
            throw new Error('Contents are too long (max 1000 characters)');
        }

        if (!validCategories.includes(data.category)) {
            throw new Error('Invalid category selected');
        }

        return true;
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const category = document.getElementById('category').value;
        const tags = collectTags(); // Collect tags from checkboxes
        const data = {
            category,
            title: document.getElementById('title').value.trim(),
            contents: document.getElementById('contents').value.trim(),
            source: document.getElementById('source').value.trim(),
            tags: tags
        };

        try {
            // Validate inputs before submission
            validateInputs(data);

            const response = await fetch(`/api/${category}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Reset form
                form.reset();

                // Show success message
                successMessage.style.display = 'block';
                errorMessage.style.display = 'none';

                // Hide success message after 3 seconds
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            } else {
                // Try to get error message from server response
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create item');
            }
        } catch (error) {
            console.error('Error:', error);
            errorMessage.textContent = error.message || 'An unexpected error occurred';
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';

            // Hide error message after 3 seconds
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
        }
    });
});
