<template>
  <div class="requirement-page">
    <!-- 项目列表视图 -->
    <div v-if="!selectedProject" class="projects-view">
      <div class="page-header">
        <h1 class="page-title">需求收集</h1>
        <p class="page-desc">选择一个项目开始收集需求，或分享表单给客户填写</p>
      </div>
      
      <div v-if="projectStore.projects.length > 0" class="projects-list">
        <div 
          v-for="project in projectStore.projects" 
          :key="project.id"
          class="project-item card"
        >
          <div class="project-item-content">
            <div class="project-info">
              <h3 class="project-name">{{ project.name }}</h3>
              <div class="project-meta">
                <span class="project-time">更新于 {{ formatTime(project.updatedAt) }}</span>
                <el-tag v-if="project.requirement" size="small" type="success">已收集需求</el-tag>
                <el-tag v-else size="small" type="info">未收集</el-tag>
              </div>
            </div>
            <div class="project-actions">
              <el-button type="primary" @click="enterProject(project)">
                <el-icon><EditPen /></el-icon>
                收集需求
              </el-button>
              <el-dropdown trigger="click" @command="(cmd) => handleShareCommand(cmd, project)">
                <el-button>
                  <el-icon><Share /></el-icon>
                  分享表单
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="copyLink">
                      <el-icon><Link /></el-icon>
                      复制链接
                    </el-dropdown-item>
                    <el-dropdown-item command="qrcode">
                      <el-icon><PictureRounded /></el-icon>
                      生成二维码
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <el-icon><FolderOpened /></el-icon>
        <p>还没有项目，请先在首页创建项目</p>
        <el-button type="primary" @click="$router.push('/')">去创建项目</el-button>
      </div>
    </div>
    
    <!-- 需求收集表单视图 -->
    <div v-else class="form-view">
      <div class="page-header">
        <el-button text @click="backToList">
          <el-icon><ArrowLeft /></el-icon>
          返回项目列表
        </el-button>
        <h1 class="page-title">需求收集</h1>
        <p class="page-desc">当前项目：{{ selectedProject.name }}</p>
      </div>
      
      <!-- 步骤指示器 -->
      <el-steps :active="currentStep" finish-status="success" class="step-indicator">
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
                  placeholder="如：公司运营人员，约2-3人"
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
            <el-button @click="saveDraft">保存草稿</el-button>
            <el-button v-if="currentStep < 6" type="primary" @click="nextStep">
              下一步
              <el-icon><ArrowRight /></el-icon>
            </el-button>
            <el-button v-else type="primary" @click="completeForm">
              完成
              <el-icon><Check /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 预览 -->
      <div v-if="showPreview" class="preview-section card">
        <div class="card-header">
          <h3 class="card-title">需求预览</h3>
          <el-button type="primary" @click="goToPRD">
            去生成PRD
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <div class="preview-content markdown-preview" v-html="previewHtml"></div>
      </div>
    </template>
    
    <!-- 未选择项目 -->
    <div v-else class="empty-state">
      <el-icon><FolderOpened /></el-icon>
      <p>请先在首页创建或选择一个项目</p>
      <el-button type="primary" @click="$router.push('/')">去首页</el-button>
    </div>
    
    <!-- 二维码弹窗 -->
    <el-dialog v-model="qrcodeVisible" title="需求收集表单二维码" width="400px">
      <div class="qrcode-dialog-content">
        <div ref="qrcodeContainer" class="qrcode-container"></div>
        <p class="qrcode-hint">客户可扫描此二维码填写需求</p>
        <el-input v-model="publicFormUrl" readonly>
          <template #append>
            <el-button @click="copyPublicFormLink">复制</el-button>
          </template>
        </el-input>
        <div class="qrcode-actions">
          <el-button type="primary" @click="downloadQRCode">
            <el-icon><Download /></el-icon>
            下载二维码
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Share, 
  Position, 
  ArrowDown, 
  ArrowLeft,
  Link, 
  PictureRounded, 
  Download,
  FolderOpened,
  EditPen
} from '@element-plus/icons-vue'
import { marked } from 'marked'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const projectStore = useProjectStore()

const selectedProject = ref(null)
const currentStep = ref(0)
const showPreview = ref(false)
const qrcodeVisible = ref(false)
const qrcodeContainer = ref(null)

const publicFormUrl = computed(() => {
  return window.location.origin + '/public-form'
})

// 进入项目收集需求
function enterProject(project) {
  selectedProject.value = project
  projectStore.setCurrentProject(project.id)
  
  // 如果项目已有需求数据，加载它
  if (project.requirement) {
    Object.assign(form, project.requirement)
  }
}

// 返回项目列表
function backToList() {
  selectedProject.value = null
  currentStep.value = 0
}

// 表单数据
const form = reactive({
  // 步骤1: 项目信息
  background: '',
  appName: '',
  appType: [],
  appTypeOther: '',
  
  // 步骤2: 用户相关
  targetUser: '',
  userScenario: '',
  userScale: '',
  
  // 步骤3: 核心功能
  featuresP0: '',
  featuresP1: '',
  featuresP2: '',
  needLogin: '',
  loginType: [],
  
  // 步骤4: 管理后台
  needAdmin: '',
  adminUser: '',
  adminFeatures: '',
  
  // 步骤5: 数据与支付
  dataStorage: '',
  contentSource: [],
  importExport: [],
  needPayment: '',
  paymentScenario: '',
  needRefund: '',
  
  // 步骤6: 设计与技术
  reference: '',
  uiStyle: '',
  colorPreference: '',
  hasAppId: '',
  appId: '',
  backend: '',
  
  // 步骤7: 时间预算
  timeline: '',
  budget: '',
  operationCost: '',
  otherNotes: ''
})

// 加载已保存的数据
onMounted(() => {
  if (projectStore.currentProject?.requirement) {
    Object.assign(form, projectStore.currentProject.requirement)
  }
})

// 监听项目切换
watch(() => projectStore.currentProjectId, () => {
  if (projectStore.currentProject?.requirement) {
    Object.assign(form, projectStore.currentProject.requirement)
  } else {
    // 重置表单
    Object.keys(form).forEach(key => {
      if (Array.isArray(form[key])) {
        form[key] = []
      } else {
        form[key] = ''
      }
    })
  }
  currentStep.value = 0
  showPreview.value = false
})

// 生成预览 Markdown
const previewMarkdown = computed(() => {
  let md = `# ${form.appName || '未命名项目'} - 需求文档\n\n`
  md += `> 收集时间：${new Date().toLocaleString()}\n\n`
  
  md += `## 一、项目基本信息\n\n`
  md += `**项目背景**：${form.background || '未填写'}\n\n`
  md += `**小程序名称**：${form.appName || '未填写'}\n\n`
  md += `**小程序类型**：${[...form.appType, form.appTypeOther].filter(Boolean).join('、') || '未填写'}\n\n`
  
  md += `## 二、用户相关\n\n`
  md += `**目标用户**：${form.targetUser || '未填写'}\n\n`
  md += `**使用场景**：${form.userScenario || '未填写'}\n\n`
  md += `**用户规模**：${form.userScale || '未填写'}\n\n`
  
  md += `## 三、核心功能\n\n`
  md += `### P0（必须实现）\n${form.featuresP0 || '未填写'}\n\n`
  md += `### P1（希望实现）\n${form.featuresP1 || '未填写'}\n\n`
  md += `### P2（锦上添花）\n${form.featuresP2 || '未填写'}\n\n`
  md += `**登录需求**：${form.needLogin || '未填写'}\n\n`
  if (form.loginType.length) {
    md += `**登录方式**：${form.loginType.join('、')}\n\n`
  }
  
  md += `## 四、管理后台\n\n`
  md += `**是否需要**：${form.needAdmin || '未填写'}\n\n`
  if (form.needAdmin === '需要') {
    md += `**使用者**：${form.adminUser || '未填写'}\n\n`
    md += `**功能需求**：${form.adminFeatures || '未填写'}\n\n`
  }
  
  md += `## 五、数据与支付\n\n`
  md += `**存储数据**：${form.dataStorage || '未填写'}\n\n`
  md += `**内容来源**：${form.contentSource.join('、') || '未填写'}\n\n`
  md += `**导入导出**：${form.importExport.join('、') || '不需要'}\n\n`
  md += `**支付需求**：${form.needPayment || '未填写'}\n\n`
  if (form.needPayment === '需要微信支付') {
    md += `**支付场景**：${form.paymentScenario || '未填写'}\n\n`
    md += `**退款需求**：${form.needRefund || '未填写'}\n\n`
  }
  
  md += `## 六、设计与技术\n\n`
  md += `**参考项目**：${form.reference || '无'}\n\n`
  md += `**UI风格**：${form.uiStyle || '未填写'}\n\n`
  md += `**色调偏好**：${form.colorPreference || '无特别要求'}\n\n`
  md += `**小程序账号**：${form.hasAppId || '未填写'}${form.appId ? ` (AppID: ${form.appId})` : ''}\n\n`
  md += `**后端服务**：${form.backend || '未填写'}\n\n`
  
  md += `## 七、时间与预算\n\n`
  md += `**期望上线时间**：${form.timeline || '未填写'}\n\n`
  md += `**预算范围**：${form.budget || '未填写'}\n\n`
  md += `**运营成本预期**：${form.operationCost || '未填写'}\n\n`
  
  if (form.otherNotes) {
    md += `## 其他说明\n\n${form.otherNotes}\n`
  }
  
  return md
})

const previewHtml = computed(() => marked(previewMarkdown.value))

function nextStep() {
  if (currentStep.value < 6) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function saveDraft() {
  projectStore.saveRequirement({ ...form })
  ElMessage.success('草稿已保存')
}

function completeForm() {
  projectStore.saveRequirement({ ...form })
  showPreview.value = true
  ElMessage.success('需求收集完成！')
}

function goToPRD() {
  router.push('/prd')
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '未知'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}

// 公共表单相关方法
function goToPublicForm() {
  window.open('/public-form', '_blank')
}

function handleShareCommand(command, project) {
  // 暂存当前要分享的项目
  if (command === 'copyLink') {
    copyPublicFormLink(project)
  } else if (command === 'qrcode') {
    showQRCode(project)
  }
}

function copyPublicFormLink(project) {
  navigator.clipboard.writeText(publicFormUrl.value)
  ElMessage.success(`已复制表单链接${project ? ` (${project.name})` : ''}`)
}

async function showQRCode(project) {
  qrcodeVisible.value = true
  
  // 等待DOM更新
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 动态加载 qrcode 库
  if (!window.QRCode) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
    script.onload = () => {
      renderQRCode()
    }
    document.head.appendChild(script)
  } else {
    renderQRCode()
  }
}

function renderQRCode() {
  if (qrcodeContainer.value) {
    qrcodeContainer.value.innerHTML = ''
    new window.QRCode(qrcodeContainer.value, {
      text: publicFormUrl.value,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff'
    })
  }
}

function downloadQRCode() {
  const canvas = qrcodeContainer.value?.querySelector('canvas')
  if (canvas) {
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = '需求收集表单二维码.png'
    a.click()
    ElMessage.success('二维码已下载')
  }
}
</script>

<style scoped>
.requirement-page {
  max-width: 900px;
  margin: 0 auto;
}

/* 项目列表视图 */
.projects-view {
  width: 100%;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-item {
  padding: 24px;
  cursor: default;
}

.project-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.project-info {
  flex: 1;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-time {
  font-size: 14px;
  color: var(--text-secondary);
}

.project-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* 表单视图 */
.form-view {
  width: 100%;
}

.page-header .el-button {
  margin-bottom: 8px;
}

/* 公共表单横幅 */
.public-form-banner {
  margin-bottom: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
}

.banner-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  flex-shrink: 0;
}

.banner-info {
  flex: 1;
}

.banner-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.banner-info p {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.banner-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* 二维码弹窗 */
.qrcode-dialog-content {
  text-align: center;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.qrcode-hint {
  margin: 0 0 16px 0;
  color: #606266;
  font-size: 14px;
}

.qrcode-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.step-indicator {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--bg-card);
  border-radius: 12px;
}

.form-container {
  margin-bottom: 24px;
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

.preview-section {
  margin-top: 24px;
}

.preview-content {
  max-height: 600px;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

:deep(.el-checkbox) {
  display: flex;
  margin-bottom: 8px;
  height: auto;
  white-space: normal;
}

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
</style>
