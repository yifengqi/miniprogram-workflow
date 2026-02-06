<template>
  <div class="public-requirement-page">
    <!-- 顶部标题 -->
    <div class="page-header">
      <h1 class="page-title">项目需求收集表</h1>
      <p class="page-desc">请认真填写以下信息，以便我们更好地理解您的需求</p>
    </div>
    
    <!-- 提示信息 -->
    <div class="info-banner">
      <el-icon><InfoFilled /></el-icon>
      <span>本表单支持随时保存，您可以分多次填写完成</span>
    </div>
    
    <!-- 步骤指示器 -->
    <el-steps :active="currentStep" finish-status="success" class="step-indicator" :simple="isMobile">
      <el-step title="项目信息" />
      <el-step title="用户相关" />
      <el-step title="核心功能" />
      <el-step title="管理后台" />
      <el-step title="数据与支付" />
      <el-step title="设计与技术" />
      <el-step title="时间预算" />
    </el-steps>
    
    <!-- 表单区域 -->
    <div class="form-container card">
      <!-- 步骤 1: 项目信息 -->
      <div v-show="currentStep === 0" class="form-step">
        <h3 class="step-title">一、项目基本信息</h3>
        
        <el-form label-position="top">
          <el-form-item label="项目背景" required>
            <el-input 
              v-model="form.background" 
              type="textarea" 
              :rows="3"
              placeholder="请简单描述您想做这个小程序的原因"
            />
          </el-form-item>
          
          <el-form-item label="小程序名称" required>
            <el-input v-model="form.appName" placeholder="您希望小程序叫什么名字？" />
          </el-form-item>
          
          <el-form-item label="小程序类型" required>
            <el-checkbox-group v-model="form.appType">
              <el-checkbox label="工具类">工具类（计算器、转换器、查询工具等）</el-checkbox>
              <el-checkbox label="电商类">电商类（商品展示、购买、订单管理等）</el-checkbox>
              <el-checkbox label="社区类">社区类（内容发布、评论、互动等）</el-checkbox>
              <el-checkbox label="服务预约类">服务预约类（预约、排队、签到等）</el-checkbox>
              <el-checkbox label="企业展示类">企业展示类（公司介绍、联系方式等）</el-checkbox>
              <el-checkbox label="活动报名类">活动报名类（活动发布、报名、管理等）</el-checkbox>
            </el-checkbox-group>
            <el-input 
              v-model="form.appTypeOther" 
              placeholder="其他类型（选填）"
              class="other-input"
            />
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 步骤 2: 用户相关 -->
      <div v-show="currentStep === 1" class="form-step">
        <h3 class="step-title">二、用户相关</h3>
        
        <el-form label-position="top">
          <el-form-item label="主要用户是谁？" required>
            <el-input 
              v-model="form.targetUser" 
              type="textarea"
              :rows="2"
              placeholder="描述用户特征，如：25-40岁的摄影爱好者，喜欢户外活动"
            />
          </el-form-item>
          
          <el-form-item label="用户使用场景" required>
            <el-input 
              v-model="form.userScenario" 
              type="textarea"
              :rows="2"
              placeholder="用户在什么情况下会打开这个小程序？想解决什么问题？"
            />
          </el-form-item>
          
          <el-form-item label="预计用户规模">
            <el-radio-group v-model="form.userScale">
              <el-radio label="小规模">小规模（&lt;100人）</el-radio>
              <el-radio label="中等规模">中等规模（100-1000人）</el-radio>
              <el-radio label="较大规模">较大规模（1000-10000人）</el-radio>
              <el-radio label="大规模">大规模（&gt;10000人）</el-radio>
              <el-radio label="不确定">不确定</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 步骤 3: 核心功能 -->
      <div v-show="currentStep === 2" class="form-step">
        <h3 class="step-title">三、核心功能</h3>
        
        <el-form label-position="top">
          <el-form-item label="必须要有的功能（P0）" required>
            <div class="feature-tip">如果只能做3个功能，您最想要哪3个？</div>
            <el-input 
              v-model="form.featuresP0" 
              type="textarea"
              :rows="4"
              placeholder="1. &#10;2. &#10;3. "
            />
          </el-form-item>
          
          <el-form-item label="希望有的功能（P1）">
            <div class="feature-tip">如果时间允许，还希望加哪些功能？</div>
            <el-input 
              v-model="form.featuresP1" 
              type="textarea"
              :rows="4"
              placeholder="1. &#10;2. &#10;3. "
            />
          </el-form-item>
          
          <el-form-item label="锦上添花的功能（P2）">
            <div class="feature-tip">有了更好，没有也能接受的功能</div>
            <el-input 
              v-model="form.featuresP2" 
              type="textarea"
              :rows="3"
              placeholder="1. &#10;2. &#10;3. "
            />
          </el-form-item>
          
          <el-form-item label="是否需要用户登录？" required>
            <el-radio-group v-model="form.needLogin">
              <el-radio label="必须登录">需要，必须登录才能使用</el-radio>
              <el-radio label="部分需要">需要，但部分功能可以不登录使用</el-radio>
              <el-radio label="不需要">不需要，纯浏览型</el-radio>
              <el-radio label="不确定">不确定</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="登录方式偏好" v-if="form.needLogin && form.needLogin !== '不需要'">
            <el-checkbox-group v-model="form.loginType">
              <el-checkbox label="微信一键登录">微信一键登录（最简单）</el-checkbox>
              <el-checkbox label="手机号登录">手机号登录</el-checkbox>
              <el-checkbox label="账号密码">账号密码登录</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 步骤 4: 管理后台 -->
      <div v-show="currentStep === 3" class="form-step">
        <h3 class="step-title">四、管理后台</h3>
        
        <el-form label-position="top">
          <el-form-item label="是否需要管理后台？" required>
            <el-radio-group v-model="form.needAdmin">
              <el-radio label="需要">需要（在电脑上管理内容、查看数据等）</el-radio>
              <el-radio label="不需要">不需要（所有操作在小程序内完成）</el-radio>
              <el-radio label="不确定">不确定</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <template v-if="form.needAdmin === '需要'">
            <el-form-item label="管理后台使用者">
              <el-input 
                v-model="form.adminUser" 
                placeholder="如:公司运营人员，约2-3人"
              />
            </el-form-item>
            
            <el-form-item label="管理后台需要哪些功能？">
              <el-input 
                v-model="form.adminFeatures" 
                type="textarea"
                :rows="3"
                placeholder="如：发布活动、查看报名名单、导出Excel、数据统计"
              />
            </el-form-item>
          </template>
        </el-form>
      </div>
      
      <!-- 步骤 5: 数据与支付 -->
      <div v-show="currentStep === 4" class="form-step">
        <h3 class="step-title">五、数据与支付</h3>
        
        <el-form label-position="top">
          <el-form-item label="需要存储哪些数据？">
            <el-input 
              v-model="form.dataStorage" 
              type="textarea"
              :rows="3"
              placeholder="如：用户信息、活动信息、报名记录、订单记录"
            />
          </el-form-item>
          
          <el-form-item label="内容从哪里来？">
            <el-checkbox-group v-model="form.contentSource">
              <el-checkbox label="管理员发布">管理员在后台发布</el-checkbox>
              <el-checkbox label="用户生成">用户自己生成（UGC）</el-checkbox>
              <el-checkbox label="系统导入">从其他系统导入</el-checkbox>
              <el-checkbox label="外部获取">实时从外部获取</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-form-item label="是否需要导入导出功能？">
            <el-checkbox-group v-model="form.importExport">
              <el-checkbox label="导入">需要导入（从Excel等导入数据）</el-checkbox>
              <el-checkbox label="导出">需要导出（导出Excel报表）</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-divider />
          
          <el-form-item label="是否涉及支付？" required>
            <el-radio-group v-model="form.needPayment">
              <el-radio label="需要微信支付">是，需要微信支付</el-radio>
              <el-radio label="仅展示价格">是，但只是展示价格，线下支付</el-radio>
              <el-radio label="不需要">否，完全免费</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <template v-if="form.needPayment === '需要微信支付'">
            <el-form-item label="支付场景">
              <el-input 
                v-model="form.paymentScenario" 
                placeholder="如：用户报名活动时支付活动费用"
              />
            </el-form-item>
            
            <el-form-item label="是否需要退款功能？">
              <el-radio-group v-model="form.needRefund">
                <el-radio label="需要">需要</el-radio>
                <el-radio label="不需要">不需要</el-radio>
                <el-radio label="不确定">不确定</el-radio>
              </el-radio-group>
            </el-form-item>
          </template>
        </el-form>
      </div>
      
      <!-- 步骤 6: 设计与技术 -->
      <div v-show="currentStep === 5" class="form-step">
        <h3 class="step-title">六、设计与技术</h3>
        
        <el-form label-position="top">
          <el-form-item label="有没有参考的小程序或App？">
            <el-input 
              v-model="form.reference" 
              type="textarea"
              :rows="2"
              placeholder="您觉得哪个小程序/App的设计或功能做得好？"
            />
          </el-form-item>
          
          <el-form-item label="UI风格偏好">
            <el-radio-group v-model="form.uiStyle">
              <el-radio label="简约清爽">简约清爽</el-radio>
              <el-radio label="科技感深色">科技感/深色</el-radio>
              <el-radio label="活泼可爱">活泼可爱</el-radio>
              <el-radio label="商务专业">商务专业</el-radio>
              <el-radio label="无特别要求">没有特别要求</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="主色调偏好">
            <el-input 
              v-model="form.colorPreference" 
              placeholder="品牌色/主色、辅助色（如果没有要求可以留空）"
            />
          </el-form-item>
          
          <el-divider />
          
          <el-form-item label="是否已有微信小程序账号？">
            <el-radio-group v-model="form.hasAppId">
              <el-radio label="有">有，已注册</el-radio>
              <el-radio label="没有">没有，需要帮忙注册</el-radio>
              <el-radio label="不确定">不确定</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="AppID" v-if="form.hasAppId === '有'">
            <el-input v-model="form.appId" placeholder="请输入 AppID" />
          </el-form-item>
          
          <el-form-item label="后端服务偏好">
            <el-radio-group v-model="form.backend">
              <el-radio label="云开发">微信云开发（推荐，省心省钱）</el-radio>
              <el-radio label="自有服务器">有自己的服务器</el-radio>
              <el-radio label="不确定">不确定，需要建议</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 步骤 7: 时间预算 -->
      <div v-show="currentStep === 6" class="form-step">
        <h3 class="step-title">七、时间与预算</h3>
        
        <el-form label-position="top">
          <el-form-item label="期望的上线时间">
            <el-input 
              v-model="form.timeline" 
              placeholder="如：希望1个月内上线，最晚不超过2个月"
            />
          </el-form-item>
          
          <el-form-item label="预算范围">
            <el-radio-group v-model="form.budget">
              <el-radio label="<5000">< 5000元</el-radio>
              <el-radio label="5000-10000">5000-10000元</el-radio>
              <el-radio label="10000-30000">10000-30000元</el-radio>
              <el-radio label="30000-50000">30000-50000元</el-radio>
              <el-radio label=">50000">> 50000元</el-radio>
              <el-radio label="看功能定">看功能定</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="后续运营成本预期（月）">
            <el-radio-group v-model="form.operationCost">
              <el-radio label="免费">尽量免费</el-radio>
              <el-radio label="<100">< 100元/月</el-radio>
              <el-radio label="100-500">100-500元/月</el-radio>
              <el-radio label=">500">> 500元/月</el-radio>
              <el-radio label="不确定">不确定</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-divider />
          
          <el-form-item label="联系方式" required>
            <el-input 
              v-model="form.contact" 
              placeholder="请留下您的微信/手机/邮箱，以便我们联系您"
            />
          </el-form-item>
          
          <el-form-item label="其他需要说明的事项">
            <el-input 
              v-model="form.otherNotes" 
              type="textarea"
              :rows="4"
              placeholder="任何其他想说的内容..."
            />
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 操作按钮 -->
      <div class="form-actions">
        <el-button v-if="currentStep > 0" @click="prevStep">
          <el-icon><ArrowLeft /></el-icon>
          上一步
        </el-button>
        <div class="actions-right">
          <el-button @click="saveDraft">
            <el-icon><DocumentCopy /></el-icon>
            保存草稿
          </el-button>
          <el-button v-if="currentStep < 6" type="primary" @click="nextStep">
            下一步
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <el-button v-else type="primary" @click="submitForm">
            <el-icon><Check /></el-icon>
            提交
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 提交成功提示 -->
    <el-dialog v-model="submitSuccess" title="提交成功" width="90%" :close-on-click-modal="false">
      <div class="success-content">
        <el-result icon="success" title="需求收集完成" sub-title="感谢您的填写！我们会尽快与您联系。">
          <template #extra>
            <div class="submit-id">
              <p>您的提交ID：<strong>{{ submissionId }}</strong></p>
              <p class="hint">请保存此ID，以便后续查询</p>
            </div>
          </template>
        </el-result>
      </div>
      <template #footer>
        <el-button type="primary" @click="copySubmissionId">复制ID</el-button>
        <el-button @click="resetForm">填写新需求</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const currentStep = ref(0)
const submitSuccess = ref(false)
const submissionId = ref('')
const isMobile = ref(false)

// 表单数据
const form = reactive({
  background: '',
  appName: '',
  appType: [],
  appTypeOther: '',
  targetUser: '',
  userScenario: '',
  userScale: '',
  featuresP0: '',
  featuresP1: '',
  featuresP2: '',
  needLogin: '',
  loginType: [],
  needAdmin: '',
  adminUser: '',
  adminFeatures: '',
  dataStorage: '',
  contentSource: [],
  importExport: [],
  needPayment: '',
  paymentScenario: '',
  needRefund: '',
  reference: '',
  uiStyle: '',
  colorPreference: '',
  hasAppId: '',
  appId: '',
  backend: '',
  timeline: '',
  budget: '',
  operationCost: '',
  contact: '',
  otherNotes: ''
})

onMounted(() => {
  // 检测是否是移动设备
  isMobile.value = window.innerWidth < 768
  
  // 尝试加载草稿
  const draft = localStorage.getItem('public_requirement_draft')
  if (draft) {
    try {
      Object.assign(form, JSON.parse(draft))
      ElMessage.info('已加载上次保存的草稿')
    } catch (e) {
      console.error('加载草稿失败', e)
    }
  }
})

function nextStep() {
  // 简单验证
  if (currentStep.value === 0) {
    if (!form.background || !form.appName || form.appType.length === 0) {
      ElMessage.warning('请填写项目基本信息中的必填项')
      return
    }
  } else if (currentStep.value === 1) {
    if (!form.targetUser || !form.userScenario) {
      ElMessage.warning('请填写用户相关的必填项')
      return
    }
  } else if (currentStep.value === 2) {
    if (!form.featuresP0 || !form.needLogin) {
      ElMessage.warning('请填写核心功能的必填项')
      return
    }
  } else if (currentStep.value === 3) {
    if (!form.needAdmin) {
      ElMessage.warning('请选择是否需要管理后台')
      return
    }
  } else if (currentStep.value === 4) {
    if (!form.needPayment) {
      ElMessage.warning('请选择是否涉及支付')
      return
    }
  } else if (currentStep.value === 6) {
    if (!form.contact) {
      ElMessage.warning('请填写联系方式')
      return
    }
  }
  
  if (currentStep.value < 6) {
    currentStep.value++
    saveDraft()
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function saveDraft() {
  try {
    localStorage.setItem('public_requirement_draft', JSON.stringify(form))
    ElMessage.success('草稿已保存')
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

function submitForm() {
  if (!form.contact) {
    ElMessage.warning('请填写联系方式')
    return
  }
  
  // 生成提交ID
  submissionId.value = 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase()
  
  // 保存到localStorage
  const submissions = JSON.parse(localStorage.getItem('public_submissions') || '[]')
  submissions.push({
    id: submissionId.value,
    data: { ...form },
    submittedAt: new Date().toISOString()
  })
  localStorage.setItem('public_submissions', JSON.stringify(submissions))
  
  // 清除草稿
  localStorage.removeItem('public_requirement_draft')
  
  submitSuccess.value = true
}

function copySubmissionId() {
  navigator.clipboard.writeText(submissionId.value)
  ElMessage.success('ID已复制到剪贴板')
}

function resetForm() {
  Object.keys(form).forEach(key => {
    if (Array.isArray(form[key])) {
      form[key] = []
    } else {
      form[key] = ''
    }
  })
  currentStep.value = 0
  submitSuccess.value = false
  submissionId.value = ''
  ElMessage.info('表单已重置')
}
</script>

<style scoped>
.public-requirement-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: var(--bg-secondary);
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.page-desc {
  color: var(--text-secondary);
  font-size: 14px;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 8px;
  color: var(--primary-color);
  margin-bottom: 24px;
  font-size: 14px;
}

.step-indicator {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--bg-card);
  border-radius: 12px;
}

.form-container {
  margin-bottom: 24px;
  padding: 24px;
}

.form-step {
  min-height: 400px;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  color: var(--primary-color);
}

.other-input {
  margin-top: 12px;
}

.feature-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  margin-top: 24px;
}

.actions-right {
  display: flex;
  gap: 12px;
}

.success-content {
  text-align: center;
}

.submit-id {
  margin-top: 20px;
}

.submit-id p {
  margin: 8px 0;
  color: var(--text-primary);
}

.submit-id strong {
  color: var(--primary-color);
  font-size: 18px;
}

.submit-id .hint {
  font-size: 12px;
  color: var(--text-muted);
}

:deep(.el-checkbox),
:deep(.el-radio) {
  display: flex;
  margin-bottom: 8px;
  height: auto;
  white-space: normal;
}

:deep(.el-checkbox-group),
:deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .public-requirement-page {
    padding: 12px;
  }
  
  .page-title {
    font-size: 22px;
  }
  
  .form-container {
    padding: 16px;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .actions-right {
    width: 100%;
    flex-direction: column;
  }
  
  .actions-right .el-button {
    width: 100%;
  }
}
</style>
