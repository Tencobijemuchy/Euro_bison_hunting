import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('src/pages/IndexPage.vue'), meta: { hideFooter: true } },
      { path: 'login', component: () => import('src/pages/LoginPage.vue'), meta: { hideFooter: true } },
      { path: 'register', component: () => import('src/pages/RegisterPage.vue'),meta: { hideFooter: true } },
      { path: 'channels', component: () => import('pages/ChannelsPage.vue') },
      { path: 'c/:channelName', component: () => import('pages/ChannelPage.vue'), props: true }
    ],
  },
  { path: '/:catchAll(.*)*', component: () => import('src/pages/ErrorNotFound.vue') },
]

export default routes
