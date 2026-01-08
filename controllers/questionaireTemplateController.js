const Questionaire = require('../models/questionaireTemplateModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Vacancy = require('../models/vacancyModel');

// Initialize OpenAI (will be null if API key not provided)
let openai = null;
try {
  if (
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
  ) {
    const OpenAI = require('openai');
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI initialized successfully');
  } else {
    console.log(
      '⚠️  OPENAI_API_KEY not found or not set in environment variables'
    );
  }
} catch (error) {
  console.log('❌ OpenAI not configured:', error.message);
  console.log('Error details:', error);
}

exports.createQuestionaire = catchAsync(async (req, res, next) => {
  const { user } = req;
  let counter = 0;

  req.body.hr = user?._id;

  await req.body.questions.forEach((ele) => {
    if (!ele.options.includes(ele?.correctAnswer)) {
      counter++;
    }
  });

  if (counter > 0) return next(new AppError('Invalid option!', 400));

  const doc = await Questionaire.create(req.body);

  res.status(201).json({
    status: 'success',
    data: doc,
  });
});

exports.updateQuestionaire = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doc = await Questionaire.findByIdAndUpdate(id, req.body, { new: true });

  if (!doc) return next(new AppError('Error While updating Questionaire'));

  res.status(200).json({
    status: 'success',
    data: doc,
  });
});

exports.getQuestionaireTemplateDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doc = await Questionaire.findById(id).populate({ path: 'hr' });

  if (!doc) return next(new AppError('Questionaire Template Not Found'));

  res.status(200).json({
    status: 'success',
    data: doc,
  });
});

exports.deleteQuestionaire = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const foundVacancy = await Vacancy.findOne({ questionaireTemplate: id });

  if (foundVacancy) {
    return next(
      new AppError('Cannot Delete Template as it is used in some Vacancy', 400)
    );
  }

  const deletedQuestionaire = await Questionaire.findByIdAndDelete(id);

  res.status(200).json({
    status: 'success',
    message: 'Successfully Deleted',
    data: deletedQuestionaire,
  });
});

exports.getMyQuestionaireTemplates = catchAsync(async (req, res, next) => {
  // for pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination, search } = req.query;
  const { user } = req;

  let query = {
    hr: user?._id,
    status: 'Active',
  };

  if (search && search != '')
    query = {
      ...query,
      title: { $regex: search, $options: 'i' },
    };

  const doc =
    noPagination && noPagination == 'true'
      ? await Questionaire.find(query).populate({ path: 'hr' }).sort('title')
      : await Questionaire.find(query)
          .populate({ path: 'hr' })
          .sort('title')
          .skip(skip)
          .limit(limit);

  const totalCount = await Questionaire.countDocuments({ hr: user?._id });

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});

// Generate questions using AI
exports.generateQuestionsWithAI = catchAsync(async (req, res, next) => {
  const { otherDetails, numberOfQuestions = 5 } = req.body;

  if (!otherDetails) {
    return next(
      new AppError('Other details are required to generate questions', 400)
    );
  }

  // Check if OpenAI is initialized, if not, try to initialize it again
  if (!openai) {
    // Try to initialize again in case env was loaded after module initialization
    try {
      if (
        process.env.OPENAI_API_KEY &&
        process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
      ) {
        const OpenAI = require('openai');
        openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI initialized on-demand');
      }
    } catch (error) {
      console.log('❌ Failed to initialize OpenAI:', error.message);
    }
  }

  if (!openai) {
    console.log(
      '❌ OpenAI not available. OPENAI_API_KEY:',
      process.env.OPENAI_API_KEY ? 'Set (but may be invalid)' : 'Not set'
    );
    return next(
      new AppError(
        'AI service is not configured. Please add OPENAI_API_KEY to environment variables and restart the server.',
        500
      )
    );
  }

  try {
    const prompt = `Generate ${numberOfQuestions} multiple choice questions based on the following details: "${otherDetails}"

For each question, provide:
1. A clear and relevant question
2. Four answer options WITHOUT any prefix like "A)", "B)", "C)", "D)" - just the option text itself
3. The correct answer (A, B, C, or D)

IMPORTANT: Do NOT include "A)", "B)", "C)", "D)" or any letter prefix in the option text. Only provide the option content.

Format your response as a JSON array where each question object has this exact structure:
{
  "question": "The question text here",
  "options": ["Option text only", "Option text only", "Option text only", "Option text only"],
  "correctAnswer": "A" (or B, C, D)
}

Example:
{
  "question": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "correctAnswer": "B"
}

Return ONLY the JSON array, no additional text or markdown formatting.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates multiple choice questions in JSON format. Always return valid JSON arrays only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0].message.content.trim();

    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = aiResponse;
    if (aiResponse.startsWith('```json')) {
      cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '');
    } else if (aiResponse.startsWith('```')) {
      cleanedResponse = aiResponse.replace(/```\n?/g, '');
    }

    // Parse JSON response
    let questions;
    try {
      questions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Validate and format questions to match our structure
    if (!Array.isArray(questions)) {
      return next(
        new AppError('AI response is not in the expected format', 500)
      );
    }

    // Format questions to match our data structure
    const formattedQuestions = questions.map((q, index) => {
      // Clean options - remove any "A)", "B)", "C)", "D)" prefixes if present
      const cleanOptions =
        Array.isArray(q.options) && q.options.length === 4
          ? q.options.map((option) => {
              // Remove patterns like "A)", "B)", "A.", "B.", "A )", etc.
              return String(option)
                .replace(/^[A-D][\)\.]\s*/i, '') // Remove "A)", "B)", "A.", "B."
                .replace(/^[A-D]\s*[\)\.]\s*/i, '') // Remove "A )", "B ."
                .replace(/^[A-D]\s*-\s*/i, '') // Remove "A -", "B -"
                .trim();
            })
          : ['Option A', 'Option B', 'Option C', 'Option D'];

      // Ensure correctAnswer is one of the options
      const correctAnswerIndex = ['A', 'B', 'C', 'D'].indexOf(
        q.correctAnswer?.toUpperCase()
      );
      const correctAnswer =
        correctAnswerIndex >= 0 && correctAnswerIndex < cleanOptions.length
          ? cleanOptions[correctAnswerIndex]
          : cleanOptions[0]; // Default to first option if invalid

      return {
        Q: `Q ${index + 1}`,
        question: q.question || 'Question text missing',
        options: cleanOptions,
        correctAnswer: correctAnswer,
      };
    });

    res.status(200).json({
      status: 'success',
      data: formattedQuestions,
    });
  } catch (error) {
    console.error('AI Generation Error:', error);
    return next(
      new AppError(`Failed to generate questions: ${error.message}`, 500)
    );
  }
});
