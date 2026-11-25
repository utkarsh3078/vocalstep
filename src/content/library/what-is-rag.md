## An Open-Book Exam for AI

Think back to your school exams. Some were closed-book. You had to answer only from memory. Others were open-book. You could look things up in your notes before writing your answer. Which one gave better answers about details, like exact dates or specific rules? Usually, the open-book one. Today, I want to explain an idea in artificial intelligence that works just like an open-book exam. It is called RAG, which stands for retrieval-augmented generation.

## The Problem RAG Solves

AI language models learn from a huge amount of text during training. After that, their knowledge is fixed, like a student who studied a year ago and has not opened a book since. This creates three problems.

First, the model does not know anything that happened after its training. Second, it has never seen private information, like your company's policies, your product manuals or your class notes. And third, when it does not know something, it may still give a confident answer that is simply wrong.

Retraining a large model every time something changes would be slow and very expensive. So we need a smarter way to give the model the right information at the right moment.

Think of a new employee on their first day. They are clever and well educated, but they do not yet know how this particular company works. You would not expect them to guess the leave policy. You would hand them the handbook. RAG does the same for an AI model.

## How RAG Works

RAG solves this in three simple steps. Retrieve, add, and generate.

Step one is retrieve. When a user asks a question, the system first searches a collection of trusted documents for the passages most related to that question. This collection could be a set of manuals, a website's help pages, or a library of research papers.

Step two is add. The system takes the most useful passages it found and places them into the prompt, along with the user's question. It is like handing the student the right pages of the textbook before they answer.

Step three is generate. The language model reads the question together with those passages and writes an answer based on them. A good system also tells the model to say, "I don't know," if the passages do not contain the answer.

## A Simple Example

Imagine a company that builds a help assistant for its customers. A customer asks, "How many days do I have to return a product?" Without RAG, the model might guess a number that sounds reasonable but is wrong. With RAG, the system first finds the company's real return policy, adds that paragraph to the prompt, and the model answers using the actual rule. It can even point to the document it used, so the customer can check.

## Why People Like RAG

RAG has become popular for several good reasons. The answers can be up to date, because you only need to update the documents, not the model. The answers are more grounded, because they come from real sources. You can show those sources, which builds trust. And private information stays in your own document store, instead of being trained into a model.

## Its Limits

RAG is not perfect. If the search step finds the wrong passages, the answer will be weak, no matter how good the model is. If the documents themselves are outdated or wrong, the answer will be too. That is why building a good RAG system is often more about organising documents and improving search than about the AI model itself.

## The Big Idea

So the next time you hear the term RAG, remember the open-book exam. Instead of asking an AI to answer from memory alone, we first help it find the right pages, and then ask it to answer. It is a simple idea, and it makes AI far more useful and far more trustworthy. Thank you.
