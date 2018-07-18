new IOService({
      name: 'User',
  },
  function(self) {
    $(this).attr('aria-pressed', true);
    $('#__admin').val(true);
    setTimeout(() => {
      $('#permissions_table_wrapper').css("opacity", "0.5");
      $("#permissions_table_wrapper input[type='checkbox']").each(function( index ) {
        $(this).prop( "checked", false );
        $(this).attr('disabled', true);
      });
    }, 100);
 
    $('#admin').attrchange(function(attrName) {
      if(attrName == 'aria-pressed'){
        $('#__admin').val($(this).attr('aria-pressed'));

        if($(this).attr('aria-pressed') == "true"){
          $('#permissions_table_wrapper').css("opacity", "0.5");
          $("#permissions_table_wrapper input[type='checkbox']").each(function( index ) {
            // $(this).prop( "checked", false );
            $(this).attr('disabled', true);
          });
        }else if($(this).attr('aria-pressed') == "false"){
          $('#permissions_table_wrapper').css("opacity", "1");
          $("#permissions_table_wrapper input[type='checkbox']").each(function( index ) {
            $(this).removeAttr('disabled');
          });
        }
      }
      
    });

    let form = document.getElementById(self.dfId);
    let fv1 = FormValidation.formValidation(
      form,
      {
        fields: {
          first_name:{
            validators:{
              notEmpty:{
                enabled: true,
                message: 'O nome é obrigatório'
              },
            }
          },
          last_name:{
            validators:{
              notEmpty:{
                enabled: true,
                message: 'O sobrenome é obrigatório'
              },
            }
          },
          email:{
            validators:{
              notEmpty:{
                enabled: true,
                message: 'O email é obrigatória'
              },
            }
          },
          password:{
            validators:{
              notEmpty:{
                message: 'A senha é obrigatória'
              },
            }
          },
          confirm_password:{
            validators:{
              identical: {
                compare: function() {
                  return form.querySelector('[name="password"]').value;
                },
                message: 'A senha e a confirmação de senha devem ser iguais'
              }
            }
          },
        },
        plugins: {
          trigger: new FormValidation.plugins.Trigger(),
          submitButton: new FormValidation.plugins.SubmitButton(),
          // defaultSubmit: new FormValidation.plugins.DefaultSubmit(),
          bootstrap: new FormValidation.plugins.Bootstrap(),
          icon: new FormValidation.plugins.Icon({
            valid: 'fv-ico ico-check',
            invalid: 'fv-ico ico-close',
            validating: 'fv-ico ico-gear ico-spin'
          }),
        },
    }).setLocale('pt_BR', FormValidation.locales.pt_BR);
    self.fv = [fv1];

    self.wizardActions(function(){
    });

    self.dt = $('#default-table').DataTable({
        aaSorting:[ [0,"desc" ]],
        ajax: self.path+'/list',
        initComplete:function(){
          //parent call
          let api = this.api();
          this.teste = 10;
          $.fn.dataTable.defaults.initComplete(this);
    
        },
        footerCallback:function(row, data, start, end, display){
        
        },
        columns: [
            { data: 'id', name: 'id'},
            { data: 'first_name', name: 'first_name'},
            { data: 'last_name', name: 'last_name'},
            { data: 'email', name: 'email'},
            { data: 'admin', name: 'admin'},
            { data: 'actions', name: 'actions'},
        ],
        columnDefs:
        [
            {targets:'__dt_',width: "3%",class:"text-center",searchable: true,orderable:true},
            {targets:'__dt_acoes',width:"7%",className:"text-center",searchable:false,orderable:false,render:function(data,type,row,y){
                return self.dt.addDTButtons({
                    buttons:[
                        {ico:'ico-eye',_class:'text-primary',title:'preview'},
                        {ico:'ico-edit',_class:'text-info',title:'editar'},
                        {ico:'ico-trash',_class:'text-danger',title:'excluir'},
                    ]});
                }
            },
            {targets:'__dt_admin',width: "2%",orderable:true,className:"text-center",render:function(data,type,row){
                if(data)
                  return self.dt.addDTIcon({ico:'ico-check',value:1,title:'usuario administrador',pos:'left',_class:'text-success'});
                else
                  return self.dt.addDTIcon({value:0,_class:'invisible'});
              }
            },   
        ]	
      }).on('click',".btn-dt-button[data-original-title=editar]",function(){
        var data = self.dt.row($(this).parents('tr')).data();
        self.view(data.id);
      }).on('click','.ico-trash',function(){
        var data = self.dt.row($(this).parents('tr')).data();
        self.delete(data.id);
      }).on('click','.ico-eye',function(){
        var data = self.dt.row($(this).parents('tr')).data();
        preview({id:data.id});
      }).on('draw.dt',function(){
        $('[data-toggle="tooltip"]').tooltip();
      });


      $('#permissions_table').DataTable({
        "paging":   false,
        "info":false,
        "ordering":false,
        "data": servicesList,
        initComplete:function(){
        },
        columns: [
            { data: 'service', name: 'service'},
            { data: 'create', name: 'create'},
            { data: 'update', name: 'update'},
            { data: 'delete', name: 'delete'},
            { data: 'view', name: 'view'},
        ],
        columnDefs:
        [
          {targets:'__dt_servico',width: "60%", searchable:false, orderable:false},
          {targets:'__dt_criar',width: "10%",class:"text-center", searchable:false, orderable:false,render:function(data,type,row){
              return '<input type="checkbox" name="permissions['+row.alias+'.create]" value="'+row.alias+'.create"><br>';
            }
          },
          {targets:'__dt_alterar',width: "10%",class:"text-center", searchable:false, orderable:false,render:function(data,type,row){
              return '<input type="checkbox" name="permissions['+row.alias+'.update]" value="'+row.alias+'.update"><br>';
            }
          },
          {targets:'__dt_excluir',width: "10%",class:"text-center", searchable:false, orderable:false,render:function(data,type,row){
              return '<input type="checkbox" name="permissions['+row.alias+'.delete]" value="'+row.alias+'.delete"><br>';
            }
          },
          {targets:'__dt_visualizar',width:"10%",className:"text-center", searchable:false, orderable:false,render:function(data,type,row){
              return '<input type="checkbox" name="permissions['+row.alias+'.view]" value="'+row.alias+'.view"><br>';
            }
          }      
        ]
      });


      self.callbacks.view = view(self);

      self.callbacks.update.onSuccess = function(){
        self.tabs['listar'].tab.tab('show');
      }

      self.callbacks.create.onSuccess = function(){
        self.dt.ajax.reload();
        self.dt.draw(true);
        self.tabs['listar'].tab.tab('show');
      }

      self.callbacks.unload = function(self){
        $(".aanjulena-btn-toggle").aaDefaultState();
  
        $('#__sl-main-group').find('.list-group-item').each(function(i,obj){
            let appended = false;
            $('.__sl-box-source').each(function(j,source){
              if($(source).find('.list-group-item').length<9 && !appended){
                $(obj).appendTo($(source));
                appended=true;
              }
            });
        });

        self.fv[0].enableValidator('password');

      }
      
  }

);

//CRUD CallBacks
function view(self){
  return{
      onSuccess:function(data){
        $("[name='first_name']").val(data.first_name);
        $("[name='last_name']").val(data.last_name);
        $("[name='email']").val(data.email);
        $("#admin").aaToggle(data.admin);
        self.fv[0].disableValidator('password');
      },
        onError:function(self){
          console.log('executa algo no erro do callback');
      }
    }
}