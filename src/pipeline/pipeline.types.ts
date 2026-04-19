export interface ExtractedPerson {
  name: string;
  relationship?: string;
  facts: string[];
}

export interface ExtractedData {
  people: ExtractedPerson[];
  emotional_tone: string[];
  topics_discussed: string[];
  key_facts: string[];
}

export interface PipelineState {
  user_id: string;
  conversation_id: string;
  message_id?: string;
  text: string;
  extracted: ExtractedData | null;
  errors: string[];
}
