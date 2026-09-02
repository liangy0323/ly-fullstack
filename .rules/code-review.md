# 编码完成自查清单

**每次完成一个功能模块后，从以下维度逐一检查。**

---

## 一、内存泄漏

### 事件监听

```ts
// ✅ 注册和清除必须成对出现
onMounted(() => {
  window.addEventListener('resize', handleResize);
  window.addEventListener(ADMIN_THEME_CHANGE_EVENT, handleThemeChange);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener(ADMIN_THEME_CHANGE_EVENT, handleThemeChange);
});

// ❌ 只注册不清除
onMounted(() => {
  window.addEventListener('resize', handleResize);
});
```

### 定时器 / 轮询

```ts
// ✅ 在 onUnmounted 中清除
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(pollData, 5000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
```

### SSE / WebSocket 连接

```ts
// ✅ 组件卸载时必须关闭连接
onUnmounted(() => {
  sseEngine.disconnect();
  ws?.close();
});
```

### watch / watchEffect

```ts
// ✅ 在 setup 中直接调用的 watch 会自动清除，无需手动处理
watch(source, callback);

// ⚠️ 异步创建的 watch 需要手动清除
let stopWatch: (() => void) | null = null;

onMounted(async () => {
  await someAsyncInit();
  stopWatch = watch(source, callback);
});

onUnmounted(() => {
  stopWatch?.();
});
```

### 闭包引用

```ts
// ❌ 闭包持有大对象，组件销毁后仍然存在
const largeData = await fetchHugeList();
const process = () => {
  // largeData 被闭包捕获，无法被 GC
  return largeData.filter(...);
};

// ✅ 用 ref 持有，组件卸载时置空
const largeData = shallowRef<HugeItem[]>([]);
onUnmounted(() => {
  largeData.value = [];
});
```

---

## 二、容错处理

> 本节是**勾选式自查清单**，对应的实现模式（竞态、防重复提交、空值防御、SSE/WebSocket 错误处理代码）见 `.rules/error-handling.md`。

### 网络异常

- [ ] 请求失败时是否有用户可感知的提示（toast / 错误状态）
- [ ] loading 状态在 `finally` 中重置，不会卡在加载中
- [ ] 关键操作有重试机制或重试按钮

### 空数据 / null 防御

- [ ] 后端返回 null/undefined 时，前端不会崩溃
- [ ] 列表为空时展示空状态组件，不是白屏
- [ ] 可选链 `?.` 和空值合并 `??` 用于不确定的数据路径

### 用户快速操作

- [ ] 提交类操作有防重复提交（loading 锁定）
- [ ] 搜索/筛选有 debounce
- [ ] 页面切换时取消进行中的请求（AbortController）
- [ ] 异步结果返回时校验是否仍然是当前上下文（竞态）

### 边界场景

- [ ] 超长文本是否有截断或滚动处理
- [ ] 文件上传是否校验了大小和类型
- [ ] 数值输入是否有范围校验
- [ ] 分页参数是否防止越界

---

## 三、代码质量

### 类型安全

- [ ] 没有新增 `any`（框架继承除外）
- [ ] 函数返回类型明确
- [ ] API 响应数据有类型定义

### 响应式正确性

- [ ] Store 状态用 `storeToRefs` 解构
- [ ] 大列表用 `shallowRef`
- [ ] computed 用于派生状态，不用方法替代

### 组件健康度

- [ ] 组件业务逻辑不超过 20 行
- [ ] Props/Emits 定义完整
- [ ] 没有遗留 `console.log` 调试代码
- [ ] Admin 没有手动导入 Element Plus 运行时组件、API 或预编译样式，类型导入均使用 `import type`

---

## 四、性能

- [ ] 没有在模板中使用函数调用替代 computed
- [ ] 长列表使用虚拟滚动或分页
- [ ] 图片/资源有懒加载
- [ ] 没有不必要的深度 watch（`{ deep: true }` 谨慎使用）

---

## 五、快速自查速记

完成功能后，在脑中过一遍这五个问题：

1. **关了吗？** — 打开的连接、监听、定时器，都关了吗？
2. **空了吗？** — 数据为空、为 null、为 undefined 时，页面还正常吗？
3. **快了吗？** — 用户连续快速操作，会不会出问题？
4. **断了吗？** — 网络断了、接口报错了，用户能看到什么？
5. **漏了吗？** — 有没有遗留 console.log、any、硬编码？
