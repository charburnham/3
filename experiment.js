// Experiment 3: Controlling for plugs
// Self-paced reading task
// Breheny, Katsos & Williams (2006)

const showDataTable = false;
const sessionTimestamp = Date.now();

const jsPsych = initJsPsych({
  on_finish: function () {
    if (showDataTable) {
      jsPsych.data.displayData("csv");
    }
  }
});

const subject_id = jsPsych.randomization.randomID(10);
const filename = `${subject_id}-${sessionTimestamp}.csv`;
const dataPipeExperimentId = "7QS2RuxjPXmk";
const osfProjectId = "vpj5q";
const osfDataComponentId = "qm7zh";

// --- Latin square assignment ---
// Randomly assign participant to one of 3 lists
const listNumber = Math.floor(Math.random() * 3);

jsPsych.data.addProperties({
  subject_id: subject_id,
  filename: filename,
  session_timestamp: sessionTimestamp,
  list: listNumber,
  osf_project: osfProjectId,
  osf_data_component: osfDataComponentId
});

// Assign conditions to items using Latin square
const conditionNames = [
  "upper_bound_some",
  "upper_bound_only_some",
  "lower_bound_some"
];

function getConditionForItem(itemIndex, list) {
  return conditionNames[(itemIndex + list) % 3];
}

// --- Build self-paced reading trials for a single text ---
function buildReadingTrials(item, conditionData, itemId, condition, isCritical) {
  const trials = [];
  const segments = conditionData.segments || conditionData;
  const triggerIdx = conditionData.trigger_index;
  const targetIdx = conditionData.target_index;
  const postTargetIdx = conditionData.post_target_index;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Sentence boundary: insert 1000ms blank
    if (seg === "||") {
      trials.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: "",
        choices: "NO_KEYS",
        trial_duration: 1000,
        data: {
          task: "sentence_break",
          item_id: itemId,
          trial_type: "html-keyboard-response"
        }
      });
      continue;
    }

    // Determine segment role
    let segmentRole = "other";
    if (isCritical && i === triggerIdx) segmentRole = "trigger";
    else if (isCritical && i === targetIdx) segmentRole = "target";
    else if (isCritical && i === postTargetIdx) segmentRole = "post_target";

    trials.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<p class="segment-display">${seg}</p>`,
      choices: [" "],
      response_ends_trial: true,
      data: {
        task: "reading",
        item_id: itemId,
        condition: condition || "filler",
        segment_text: seg,
        segment_index: i,
        segment_role: segmentRole,
        is_critical: isCritical,
        list: listNumber,
        trial_type: "html-keyboard-response"
      }
    });
  }

  return trials;
}

// --- Build comprehension question trial ---
function buildQuestionTrial(question, itemId) {
  if (!question) return [];
  return [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div class="comprehension-question">
          <p>${question.text}</p>
          <p style="font-size: 16px; color: #666;"><strong>F</strong> = Yes &nbsp;&nbsp;&nbsp; <strong>J</strong> = No</p>
        </div>
      `,
      choices: ["f", "j"],
      data: {
        task: "comprehension",
        item_id: itemId,
        correct_answer: question.correct,
        question_text: question.text,
        trial_type: "html-keyboard-response"
      },
      on_finish: function (data) {
        const response = data.response;
        const isYes = response === "f";
        data.participant_answer = isYes ? "yes" : "no";
        data.correct = data.participant_answer === data.correct_answer;
      }
    }
  ];
}

// --- Instructions ---
const welcomeScreen = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class="instructions">
      <h2>Welcome</h2>
      <p>Thank you for participating in this experiment.</p>
      <p>In this task, you will read short texts presented segment by segment on the screen.</p>
      <p>Press <strong>Space</strong> to continue.</p>
    </div>
  `,
  choices: [" "],
  data: {
    task: "welcome",
    trial_type: "html-keyboard-response"
  }
};

const instructionsScreen = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class="instructions">
      <h2>Instructions</h2>
      <p>You will read short texts presented <strong>one segment at a time</strong>.</p>
      <p>After reading each segment carefully, press the <strong>Space bar</strong> to see the next one.</p>
      <ul>
        <li>Read each segment only once and do not try to memorise it.</li>
        <li>Make sure you fully understand each segment before advancing.</li>
        <li>Some texts will be followed by a <strong>Yes/No comprehension question</strong>.</li>
        <li>For questions: press <strong>F</strong> for Yes, <strong>J</strong> for No.</li>
        <li>Please answer as accurately as possible.</li>
      </ul>
      <p>We will begin with a few practice items.</p>
      <p>Press <strong>Space</strong> to start the practice.</p>
    </div>
  `,
  choices: [" "],
  data: {
    task: "instructions",
    trial_type: "html-keyboard-response"
  }
};

// --- Build practice block ---
const practiceTimeline = [];
for (const item of practiceItems) {
  const trials = buildReadingTrials(
    item,
    { segments: item.segments },
    item.id,
    "practice",
    false
  );
  practiceTimeline.push(...trials);
  if (item.question) {
    practiceTimeline.push(...buildQuestionTrial(item.question, item.id));
  }
}

const endPractice = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class="instructions">
      <h2>End of Practice</h2>
      <p>The practice is over. The experiment will now begin.</p>
      <p>Remember: press <strong>Space</strong> to advance segments, <strong>F</strong> for Yes, <strong>J</strong> for No on questions.</p>
      <p>Press <strong>Space</strong> to start the experiment.</p>
    </div>
  `,
  choices: [" "],
  data: {
    task: "end_practice",
    trial_type: "html-keyboard-response"
  }
};

// --- Build experimental block ---
// Assign conditions to critical items
const experimentalTrials = [];

for (let i = 0; i < criticalItems.length; i++) {
  const item = criticalItems[i];
  const condition = getConditionForItem(i, listNumber);
  const conditionData = item.conditions[condition];

  experimentalTrials.push({
    itemId: item.id,
    condition: condition,
    isCritical: true,
    conditionData: conditionData,
    question: item.question,
    segments: conditionData.segments
  });
}

// Add filler items
for (const item of fillerItems) {
  experimentalTrials.push({
    itemId: item.id,
    condition: "filler",
    isCritical: false,
    conditionData: { segments: item.segments },
    question: item.question,
    segments: item.segments
  });
}

// Shuffle the experimental trials
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const shuffledTrials = shuffle(experimentalTrials);

// Split into two halves for rest break
const halfPoint = Math.ceil(shuffledTrials.length / 2);
const firstHalf = shuffledTrials.slice(0, halfPoint);
const secondHalf = shuffledTrials.slice(halfPoint);

function buildTrialBlock(trialList) {
  const timeline = [];
  for (const trial of trialList) {
    const readingTrials = buildReadingTrials(
      trial,
      trial.conditionData,
      trial.itemId,
      trial.condition,
      trial.isCritical
    );
    timeline.push(...readingTrials);
    if (trial.question) {
      timeline.push(...buildQuestionTrial(trial.question, trial.itemId));
    }
  }
  return timeline;
}

const firstBlock = buildTrialBlock(firstHalf);

const restBreak = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class="instructions">
      <h2>Rest Break</h2>
      <p>You are halfway through the experiment. Please take a short break.</p>
      <p>When you are ready to continue, press <strong>Space</strong>.</p>
    </div>
  `,
  choices: [" "],
  data: {
    task: "rest_break",
    trial_type: "html-keyboard-response"
  }
};

const secondBlock = buildTrialBlock(secondHalf);

// --- Debrief ---
const debrief = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function () {
    const comprehensionTrials = jsPsych.data.get().filter({ task: "comprehension" });
    const total = comprehensionTrials.count();
    const correct = comprehensionTrials.filter({ correct: true }).count();
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return `
      <div class="instructions">
        <h2>Experiment Complete</h2>
        <p>Thank you for your participation!</p>
        <p>You answered <strong>${correct}</strong> out of <strong>${total}</strong> comprehension questions correctly (${pct}%).</p>
        <p>Press <strong>Space</strong> to upload your data.</p>
        <p>Please do not close this page until you see the final confirmation screen.</p>
      </div>
    `;
  },
  choices: [" "],
  data: {
    task: "debrief",
    trial_type: "html-keyboard-response"
  }
};

const save_data = {
  type: jsPsychPipe,
  action: "save",
  experiment_id: dataPipeExperimentId,
  filename: filename,
  data_string: () => jsPsych.data.get().csv(),
  wait_message: `
    <div class="instructions">
      <h2>Uploading Data</h2>
      <p>Your responses are being uploaded to OSF through DataPipe.</p>
      <p>Please do not close this page.</p>
    </div>
  `,
  data: {
    task: "save_data",
    trial_type: "pipe-save"
  }
};

const saveStatusScreen = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function () {
    const saveTrial = jsPsych.data.get().filter({ task: "save_data" }).last(1).values()[0];

    if (saveTrial?.success) {
      return `
        <div class="instructions">
          <h2>Upload Complete</h2>
          <p>Your data were saved successfully.</p>
          <p>Participant file: <strong>${filename}</strong></p>
          <p>You may now close this page.</p>
        </div>
      `;
    }

    const errorCode = saveTrial?.result?.error || "UNKNOWN_ERROR";
    const errorMessage = saveTrial?.result?.message || "No success response was returned by DataPipe.";

    return `
      <div class="instructions">
        <h2>Upload Failed</h2>
        <p>DataPipe did not confirm a successful upload.</p>
        <p><strong>Error code:</strong> ${errorCode}</p>
        <p><strong>Message:</strong> ${errorMessage}</p>
        <p>Please take a screenshot of this page before closing it.</p>
      </div>
    `;
  },
  choices: [" "],
  data: {
    task: "save_status",
    trial_type: "html-keyboard-response"
  }
};

// --- Run experiment ---
const timeline = [
  welcomeScreen,
  instructionsScreen,
  ...practiceTimeline,
  endPractice,
  ...firstBlock,
  restBreak,
  ...secondBlock,
  debrief
];

timeline.push(save_data);
timeline.push(saveStatusScreen);

jsPsych.run(timeline);
