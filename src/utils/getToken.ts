window.addEventListener('message', (event) => {
  console.log('iframe', event)

  if (event.data.action === 'token') {
    console.log('token为', event.data.payload.token)
  }
})
window.top!.postMessage(
  {
    action: 'ready',
  },
  '*',
)
