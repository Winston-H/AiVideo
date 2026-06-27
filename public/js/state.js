export const state = {
  ideas: [],
  loading: false
};

export function setIdeas(ideas) {
  state.ideas = ideas;
}

export function setLoading(value) {
  state.loading = value;
}
